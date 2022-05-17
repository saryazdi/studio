// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { simplify } from "intervals-fn";
import { isEqual } from "lodash";

import { filterMap } from "@foxglove/den/collection";
import Log from "@foxglove/log";
import {
  Time,
  subtract as subtractTimes,
  toNanoSec,
  add,
  compare,
  fromNanoSec,
} from "@foxglove/rostime";
import { MessageEvent } from "@foxglove/studio";
import { MessageBlock, Progress } from "@foxglove/studio-base/players/types";

import { IIterableSource } from "./IIterableSource";

const log = Log.getLogger(__filename);

type BlockLoaderArgs = {
  cacheSizeBytes: number;
  source: IIterableSource;
  start: Time;
  end: Time;
  maxBlocks: number;
  minBlockDurationNs: number;
};

// A BlockSpan is a continuous set of blocks and topics to load for those blocks
type BlockSpan = {
  beginId: number;
  endId: number;
  topics: Set<string>;
};

type Blocks = (MessageBlock | undefined)[];

/**
 * BlockLoader manages loading blocks from a source. Blocks pre-loaded ranges of messages on topics.
 */
export class BlockLoader {
  private source: IIterableSource;
  private blocks: Blocks = [];
  private start: Time;
  private end: Time;
  private blockDurationNanos: number;
  private topics: Set<string> = new Set();
  private maxCacheSize: number = 0;

  constructor(args: BlockLoaderArgs) {
    this.source = args.source;
    this.start = args.start;
    this.end = args.end;
    this.maxCacheSize = args.cacheSizeBytes;

    const totalNs = Number(toNanoSec(subtractTimes(this.end, this.start))) + 1; // +1 since times are inclusive.
    if (totalNs > Number.MAX_SAFE_INTEGER * 0.9) {
      throw new Error("Time range is too long to be supported");
    }

    this.blockDurationNanos = Math.ceil(
      Math.max(args.minBlockDurationNs, totalNs / args.maxBlocks),
    );

    const blockCount = Math.ceil(totalNs / this.blockDurationNanos);

    log.debug(`Block count: ${blockCount}`);
    this.blocks = Array.from({ length: blockCount });
  }

  setTopics(topics: Set<string>): void {
    this.topics = topics;
  }

  async load(time: Time, update: (progress: Progress) => Promise<void>): Promise<void> {
    log.info("Start block load", time);

    const topics = this.topics;

    let progress = this.progress(topics);

    // Block caching works on the assumption that when seeking, the user wants to look at some
    // data before and after the current time.
    //
    // When we start to load blocks, we start at 1 second before _time_ and load to the end.
    // Then we load from the start to 1 second before.
    //
    // Given the following blocks and a load start time within block "5":
    // [1, 2, 3, 4, 5, 6, 7, 8, 9]
    //
    // The block load order is:
    // 4, 5, 6, 7, 8, 9, 1, 2, 3
    //
    // When we need to evict, we evict backwards from the load blocks, so we evict: 3, 2, 1, 9, etc

    const startTime = subtractTimes(subtractTimes(time, this.start), { sec: 1, nsec: 0 });

    // turn startTime into a block ID with a min block id of 0
    const startNs = Math.max(0, Number(toNanoSec(startTime)));
    const beginBlockId = Math.floor(startNs / this.blockDurationNanos);

    const startBlockId = 0;
    const endBlockId = this.blocks.length - 1;

    // Setup the block load order.
    // The load order is from [beginBlock to endBlock], then [startBlock, beginBlock)
    // Reversing this order produces the evict queue
    const loadQueue: number[] = [];
    for (let i = beginBlockId; i <= endBlockId; ++i) {
      loadQueue.push(i);
    }
    for (let i = startBlockId; i < beginBlockId; ++i) {
      loadQueue.push(i);
    }

    // When the list of topics changes, we want to avoid loading topics if the block already has the topic.
    // Create spans of blocks based on which topics they need. This allows us to make larger requests
    // for message data from the source which typically reduces overhead.
    const blockSpans: BlockSpan[] = [];

    let activeSpan: BlockSpan | undefined;
    for (let i = beginBlockId; i <= endBlockId; ++i) {
      // compute the topics this block needs
      const existingBlock = this.blocks[i];
      const blockTopics = existingBlock ? Object.keys(existingBlock.messagesByTopic) : [];

      const topicsToFetch = new Set(topics);
      for (const topic of blockTopics) {
        topicsToFetch.delete(topic);
      }

      if (!activeSpan) {
        activeSpan = {
          beginId: i,
          endId: i,
          topics: topicsToFetch,
        };
        continue;
      }

      // If the topics of the active span equal the topics to fetch, grow the span
      if (isEqual(activeSpan.topics, topicsToFetch)) {
        activeSpan.endId = i;
        continue;
      }

      blockSpans.push(activeSpan);
      activeSpan = {
        beginId: i,
        endId: i,
        topics: topicsToFetch,
      };
    }
    if (activeSpan) {
      blockSpans.push(activeSpan);
    }

    let totalBlockSizeBytes = this.cacheSize();

    log.debug("spans", blockSpans);

    // Load all the spans, each span is a separate iterator because it requires different topics
    for (const span of blockSpans) {
      // No need to load spans with no topics
      if (span.topics.size === 0) {
        continue;
      }

      // Start and end time are inclusive
      const iteratorStartTime = add(
        this.start,
        fromNanoSec(BigInt(span.beginId * this.blockDurationNanos)),
      );
      const iteratorEndTime = add(
        this.start,
        fromNanoSec(BigInt(span.endId * this.blockDurationNanos + this.blockDurationNanos)),
      );

      // fixme - remember that an iterator can produce no messages
      // this means there were no messages for the range user wanted
      const iterator = this.source.messageIterator({
        topics: Array.from(span.topics),
        start: iteratorStartTime,
        end: iteratorEndTime,
      });

      // fixme - A block is created when all the messages for its time would fall into the block
      // As we read messages from the iterator, we need to determine when we move to the next block

      let messagesByTopic: Record<string, MessageEvent<unknown>[]> = {};
      // Set all topic arrays to empty to indicate we've read this topic
      for (const topic of span.topics) {
        messagesByTopic[topic] = [];
      }

      let blockId = span.beginId;
      const nextBlockTime = add(iteratorStartTime, fromNanoSec(BigInt(this.blockDurationNanos)));

      let sizeInBytes = 0;
      for (;;) {
        const result = await iterator.next();
        if (result.done === true) {
          // no more messages, write the block
          const existingBlock = this.blocks[blockId];
          const block: MessageBlock = {
            messagesByTopic: {
              ...existingBlock?.messagesByTopic,
              ...messagesByTopic,
            },
            sizeInBytes: sizeInBytes + (existingBlock?.sizeInBytes ?? 0),
          };

          this.blocks[blockId] = block;
          break;
        }
        const iterResult = result.value; // State change requested, bail

        // fixme - abort
        //if (this.nextState) {
        //   await iterator.return?.();
        //   return;
        //}

        if (iterResult.problem) {
          // fixme - report problems
          //  this.problemManager.addProblem(`connid-${iterResult.connectionId}`, iterResult.problem);
          continue;
        }

        // fixme - messages arrive in time order from the iterator
        // but they might skip blocks

        // message is done, write the block
        if (compare(iterResult.msgEvent.receiveTime, nextBlockTime) > 0) {
          const existingBlock = this.blocks[blockId];
          const block = {
            messagesByTopic: {
              ...existingBlock?.messagesByTopic,
              ...messagesByTopic,
            },
            sizeInBytes: sizeInBytes + (existingBlock?.sizeInBytes ?? 0),
          };

          this.blocks[blockId] = block;

          // fixme - calculate the block id of the block this next message is going to load into
          // if the new block id is > 1 from the previous block id, then we need to fill blocks with empty cause
          // they didn't have any messages
          // this block id might be outside our span - which BTW is an invariant since we calculated the end time
          // if it is, then we
          const newBlockId = this.timeToBlockId(iterResult.msgEvent.receiveTime);

          // fixme - don't add 1 here, but compute the block Id of the next block using the receive time
          // this might be in the next span so we need to finish up this one
          blockId = newBlockId;

          // start a new message batch
          messagesByTopic = {};
          // Set all topic arrays to empty to indicate we've read this topic
          for (const topic of span.topics) {
            messagesByTopic[topic] = [];
          }

          progress = this.progress(topics);
        }

        const msgTopic = iterResult.msgEvent.topic;
        const events = messagesByTopic[msgTopic];

        if (!events) {
          // fixme
          /*
          this.problemManager.addProblem(`exexpected-topic-${msgTopic}`, {
            severity: "error",
            message: `Received a messaged on an unexpected topic: ${msgTopic}.`,
          });
          */
          continue;
        }
        // fixme
        // this.problemManager.removeProblem(`exexpected-topic-${msgTopic}`);

        const messageSizeInBytes = iterResult.msgEvent.sizeInBytes;
        sizeInBytes += messageSizeInBytes;

        // Adding this message will exceed the cache size
        // Evict blocks until we have enough size for the message
        while (
          loadQueue.length > 0 &&
          totalBlockSizeBytes + messageSizeInBytes > this.maxCacheSize
        ) {
          const evictId = loadQueue.pop();
          if (evictId != undefined) {
            const lastBlock = this.blocks[evictId];
            this.blocks[evictId] = undefined;
            if (lastBlock) {
              totalBlockSizeBytes -= lastBlock.sizeInBytes;
              totalBlockSizeBytes = Math.max(0, totalBlockSizeBytes);
            }
          }
        }

        totalBlockSizeBytes += messageSizeInBytes;
        events.push(iterResult.msgEvent);

        await update(progress);
      }

      // fixme - the set tracks all the block ids we did not load in the span because the iterator had no messages
      // for these blocks we set the topics to empty since we know they don't have any messages
    }

    await update(progress);
  }

  /// ---- private

  private progress(topics: Set<string>): Progress {
    const fullyLoadedFractionRanges = simplify(
      filterMap(this.blocks, (thisBlock, blockIndex) => {
        if (!thisBlock) {
          return;
        }

        for (const topic of topics) {
          if (!thisBlock.messagesByTopic[topic]) {
            return;
          }
        }

        return {
          start: blockIndex,
          end: blockIndex + 1,
        };
      }),
    );

    return {
      fullyLoadedFractionRanges: fullyLoadedFractionRanges.map((range) => ({
        // Convert block ranges into fractions.
        start: range.start / this.blocks.length,
        end: range.end / this.blocks.length,
      })),
      messageCache: {
        blocks: this.blocks.slice(),
        startTime: this.start,
      },
    };
  }

  private cacheSize(): number {
    return this.blocks.reduce((prev, block) => {
      if (!block) {
        return prev;
      }

      return prev + block.sizeInBytes;
    }, 0);
  }

  // Convert a time to a blockId. Return -1 if the time cannot be converted to a valid block id
  private timeToBlockId(stamp: Time): number {
    const startNs = toNanoSec(this.start);
    const stampNs = toNanoSec(stamp);
    const offset = stampNs - startNs;
    if (offset < 0) {
      return -1;
    }

    return Number(offset / BigInt(this.blockDurationNanos));
  }
}
