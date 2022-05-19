// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import DataObjectIcon from "@mui/icons-material/DataObject";
import {
  Button,
  CardHeader,
  CircularProgress,
  Grid,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { groupBy, sortBy } from "lodash";
import { Fragment, useCallback, useState } from "react";

import { filterMap } from "@foxglove/den/collection";
import * as PanelAPI from "@foxglove/studio-base/PanelAPI";
import { useMessagePipeline } from "@foxglove/studio-base/components/MessagePipeline";
import Panel from "@foxglove/studio-base/components/Panel";
import PanelToolbar from "@foxglove/studio-base/components/PanelToolbar";
import Stack from "@foxglove/studio-base/components/Stack";
import {
  Topic,
  MessageEvent,
  SubscribePayload,
  AdvertiseOptions,
} from "@foxglove/studio-base/players/types";
import { downloadTextFile } from "@foxglove/studio-base/util/download";
import { getTopicsByTopicName } from "@foxglove/studio-base/util/selectors";

import helpContent from "./index.help.md";

const RECORD_ALL = "RECORD_ALL";

function getSubscriptionGroup({ requester }: SubscribePayload): string {
  if (!requester) {
    return "<unknown>";
  }
  switch (requester.type) {
    case "panel":
      return `Panel “${requester.name}”`;
    case "node":
      return `Node “${requester.name}”`;
    case "other":
      return requester.name;
  }
}

function getPublisherGroup({ options }: AdvertiseOptions): string {
  const name = options?.["name"];
  if (typeof name !== "string") {
    return "<Studio>";
  }
  return name;
}

type RecordedData = {
  readonly topics: Topic[];
  readonly frame: {
    [key: string]: readonly MessageEvent<unknown>[];
  };
};

const HistoryRecorder = React.memo(function HistoryRecorder({
  topicsByName,
  recordingTopics,
  recordedData,
}: {
  topicsByName: { [topic: string]: Topic };
  recordingTopics: string[];
  recordedData: React.MutableRefObject<RecordedData | undefined>;
}) {
  const frame = PanelAPI.useMessagesByTopic({ topics: recordingTopics, historySize: 1 });
  recordedData.current = {
    topics: filterMap(recordingTopics, (name) => topicsByName[name]),
    frame,
  };
  return ReactNull;
});

// Display internal state for debugging and viewing topic dependencies.
function Internals() {
  const [menuAnchorEl, setMenuAnchorEl] = useState<undefined | HTMLElement>(undefined);
  const menuOpen = Boolean(menuAnchorEl);
  const { topics } = PanelAPI.useDataSourceInfo();
  const topicsByName = React.useMemo(() => getTopicsByTopicName(topics), [topics]);
  const subscriptions = useMessagePipeline(
    useCallback(({ subscriptions: pipelineSubscriptions }) => pipelineSubscriptions, []),
  );
  const publishers = useMessagePipeline(
    useCallback(({ publishers: pipelinePublishers }) => pipelinePublishers, []),
  );
  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setMenuAnchorEl(undefined);
  };

  const [groupedSubscriptions, subscriptionGroups] = React.useMemo(() => {
    const grouped = groupBy(subscriptions, getSubscriptionGroup);
    return [grouped, Object.keys(grouped)];
  }, [subscriptions]);

  const renderedSubscriptions = React.useMemo(() => {
    if (subscriptions.length === 0) {
      return "(none)";
    }
    return Object.keys(groupedSubscriptions)
      .sort()
      .map((key) => {
        return (
          <Fragment key={key}>
            <div style={{ marginTop: 16 }}>{key}:</div>
            <ul style={{ fontSize: 10, marginLeft: 8 }}>
              {sortBy(groupedSubscriptions[key], (sub) => sub.topic).map((sub, i) => (
                <li key={i} style={{ margin: "4px 0" }}>
                  <code>{sub.topic}</code>
                </li>
              ))}
            </ul>
          </Fragment>
        );
      });
  }, [groupedSubscriptions, subscriptions.length]);

  const renderedPublishers = React.useMemo(() => {
    if (publishers.length === 0) {
      return "(none)";
    }
    const groupedPublishers = groupBy(publishers, getPublisherGroup);
    return Object.keys(groupedPublishers)
      .sort()
      .map((key) => {
        return (
          <Fragment key={key}>
            <div style={{ marginTop: 16 }}>{key}:</div>
            <ul style={{ fontSize: 10, marginLeft: 8 }}>
              {sortBy(groupedPublishers[key], (sub) => sub.topic).map((sub, i) => (
                <li key={i} style={{ margin: "4px 0" }}>
                  <code>{sub.topic}</code>
                </li>
              ))}
            </ul>
          </Fragment>
        );
      });
  }, [publishers]);

  const [recordGroup, setRecordGroup] = React.useState<string>(RECORD_ALL);
  const [recordingTopics, setRecordingTopics] = React.useState<string[] | undefined>();
  const recordedData = React.useRef<RecordedData | undefined>();

  function onRecordClick() {
    if (recordingTopics) {
      recordedData.current = undefined;
      setRecordingTopics(undefined);
      return;
    }
    const recordSubs =
      recordGroup === RECORD_ALL ? subscriptions : groupedSubscriptions[recordGroup] ?? [];
    setRecordingTopics(recordSubs.map((sub) => sub.topic));
  }

  function downloadJSON() {
    const dataJson = JSON.stringify(recordedData.current);
    downloadTextFile(dataJson ? dataJson : "{}", "fixture.json");
  }

  return (
    <Stack fullHeight>
      <PanelToolbar helpContent={helpContent} />
      <Stack overflowY="auto">
        <CardHeader
          title="Recording"
          titleTypographyProps={{
            variant: "h3",
            fontWeight: 600,
          }}
          subheader="Press to start recording topic data for debug purposes. The latest messages on each topic will be kept and formatted into a fixture that can be used to create a test."
          subheaderTypographyProps={{
            variant: "body2",
            color: "text.secondary",
          }}
        />
        <Stack direction="row" flex="auto" wrap="wrap" paddingX={2} gap={1}>
          <Button
            variant="contained"
            disableRipple
            data-test="internals-record-button"
            color={recordingTopics ? "error" : "primary"}
            onClick={onRecordClick}
            endIcon={recordingTopics && <CircularProgress color="inherit" size={14} />}
          >
            {recordingTopics ? `Recording ${recordingTopics.length} topics…` : "Record raw data"}
          </Button>
          <Button
            disabled={!!recordingTopics}
            disableRipple
            id="recording-topics-button"
            aria-controls={menuOpen ? "recording-topics-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={menuOpen ? "true" : undefined}
            onClick={handleMenuClick}
            color="inherit"
            variant="contained"
            endIcon={<ArrowDropDownIcon />}
          >
            {`Record from: ${recordGroup === RECORD_ALL ? "All panels" : recordGroup}`}
          </Button>
          <Menu
            id="recording-topics-menu"
            anchorEl={menuAnchorEl}
            open={menuOpen}
            onClose={handleMenuClose}
            MenuListProps={{
              "aria-labelledby": "recording-topics-button",
              dense: true,
            }}
          >
            <MenuItem
              onClick={() => {
                setRecordGroup(RECORD_ALL);
                handleMenuClose();
              }}
            >
              All panels
            </MenuItem>
            {subscriptionGroups.map((group) => (
              <MenuItem
                key={group}
                onClick={() => {
                  setRecordGroup(group);
                  handleMenuClose();
                }}
              >
                {group}
              </MenuItem>
            ))}
          </Menu>
          {recordingTopics && (
            <Button
              size="small"
              variant="contained"
              color="inherit"
              onClick={downloadJSON}
              data-test="internals-download-button"
              startIcon={<DataObjectIcon />}
            >
              Download JSON
            </Button>
          )}
          {recordingTopics && (
            <HistoryRecorder
              topicsByName={topicsByName}
              recordingTopics={recordingTopics}
              recordedData={recordedData}
            />
          )}
        </Stack>
        <Grid container spacing={2} padding={2} paddingTop={4}>
          <Grid item component="section" xs={6} data-test="internals-subscriptions">
            <Typography variant="h4" fontWeight={600} gutterBottom>
              Subscriptions
            </Typography>
            {renderedSubscriptions}
          </Grid>
          <Grid item component="section" xs={6} data-test="internals-publishers">
            <Typography variant="h4" fontWeight={600} gutterBottom>
              Publishers
            </Typography>
            {renderedPublishers}
          </Grid>
        </Grid>
      </Stack>
    </Stack>
  );
}
Internals.panelType = "Internals";
Internals.defaultConfig = {};

export default Panel(Internals);
