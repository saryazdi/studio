// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import {
  Map as LeafMap,
  TileLayer,
  LatLngBounds,
  CircleMarker,
  FeatureGroup,
  LayerGroup,
  geoJSON,
  Layer,
} from "leaflet";
import { difference, minBy, partition, transform, union } from "lodash";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useResizeDetector } from "react-resize-detector";
import { useDebouncedCallback } from "use-debounce";

import { toSec } from "@foxglove/rostime";
import { PanelExtensionContext, MessageEvent } from "@foxglove/studio";
import EmptyState from "@foxglove/studio-base/components/EmptyState";
import {
  SettingsTreeAction,
  SettingsTreeFields,
  SettingsTreeRoots,
} from "@foxglove/studio-base/components/SettingsTreeEditor/types";
import FilteredPointLayer, {
  POINT_MARKER_RADIUS,
} from "@foxglove/studio-base/panels/Map/FilteredPointLayer";
import { Topic } from "@foxglove/studio-base/players/types";
import { FoxgloveMessages } from "@foxglove/studio-base/types/FoxgloveMessages";
import { darkColor, lightColor, lineColors } from "@foxglove/studio-base/util/plotColors";

import { hasFix } from "./support";
import { MapPanelMessage, Point } from "./types";

// Persisted panel state
type Config = {
  customTileUrl: string;
  disabledTopics: string[];
  layer: string;
  zoomLevel?: number;
};

type MapPanelProps = {
  context: PanelExtensionContext;
};

function isGeoJSONMessage(
  message: MessageEvent<unknown>,
): message is MessageEvent<FoxgloveMessages["foxglove.GeoJSON"]> {
  return (
    typeof message.message === "object" &&
    message.message != undefined &&
    "geojson" in message.message
  );
}

function buildSettingsTree(config: Config, eligibleTopics: string[]): SettingsTreeRoots {
  const topics: SettingsTreeFields = transform(
    eligibleTopics,
    (result, topic) => {
      result[topic] = {
        label: topic,
        input: "boolean",
        value: !config.disabledTopics.includes(topic),
      };
    },
    {} as SettingsTreeFields,
  );

  const generalSettings: SettingsTreeFields = {
    layer: {
      label: "Tile Layer",
      input: "select",
      value: config.layer,
      options: [
        { label: "Map", value: "map" },
        { label: "Satellite", value: "satellite" },
        { label: "Custom", value: "custom" },
      ],
    },
  };

  // Only show the custom url input when the user selects the custom layer
  if (config.layer === "custom") {
    generalSettings.customTileUrl = {
      label: "Custom map tile URL",
      input: "string",
      value: config.customTileUrl,
    };
  }

  const settings: SettingsTreeRoots = {
    general: {
      label: "General",
      icon: "Settings",
      fields: generalSettings,
    },
    topics: {
      label: "Topics",
      fields: topics,
    },
  };

  return settings;
}

function topicMessageType(topic: Topic) {
  if (
    topic.datatype === "sensor_msgs/NavSatFix" ||
    topic.datatype === "sensor_msgs/msg/NavSatFix" ||
    topic.datatype === "ros.sensor_msgs.NavSatFix" ||
    topic.datatype === "foxglove.LocationFix"
  ) {
    return "navsat";
  }

  if (topic.datatype === "foxglove.GeoJSON") {
    return "geojson";
  }

  return undefined;
}

function MapPanel(props: MapPanelProps): JSX.Element {
  const { context } = props;

  const mapContainerRef = useRef<HTMLDivElement>(ReactNull);

  const [config, setConfig] = useState<Config>(() => {
    const initialConfig = props.context.initialState as Partial<Config>;
    initialConfig.disabledTopics = initialConfig.disabledTopics ?? [];
    initialConfig.layer = initialConfig.layer ?? "map";
    initialConfig.customTileUrl = initialConfig.customTileUrl ?? "";
    return initialConfig as Config;
  });

  const [tileLayer] = useState(
    new TileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
      maxNativeZoom: 18,
      maxZoom: 24,
    }),
  );

  const [satelliteLayer] = useState(
    new TileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          "&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
        maxNativeZoom: 18,
        maxZoom: 24,
      },
    ),
  );

  const [customLayer] = useState(
    new TileLayer("https://example.com/{z}/{y}/{x}", {
      attribution: "",
      maxNativeZoom: 18,
      maxZoom: 24,
    }),
  );

  // Panel state management to update our set of messages
  // We use state to trigger a render on the panel
  const [allMapMessages, setAllMapMessages] = useState<MapPanelMessage[]>([]);
  const [currentMapMessages, setCurrentMapMessages] = useState<MapPanelMessage[]>([]);

  const [allGeoMessages, allNavMessages] = useMemo(
    () => partition(allMapMessages, isGeoJSONMessage),
    [allMapMessages],
  );

  const [currentGeoMessages, currentNavMessages] = useMemo(
    () => partition(currentMapMessages, isGeoJSONMessage),
    [currentMapMessages],
  );

  // Panel state management to track the list of available topics
  const [topics, setTopics] = useState<readonly Topic[]>([]);

  // Panel state management to track the current preview time
  const [previewTime, setPreviewTime] = useState<number | undefined>();

  const [currentMap, setCurrentMap] = useState<LeafMap | undefined>(undefined);

  const onResize = useCallback(() => {
    currentMap?.invalidateSize();
  }, [currentMap]);

  // Use a debounce and 0 refresh rate to avoid triggering a resize observation while handling
  // an existing resize observation.
  // https://github.com/maslianok/react-resize-detector/issues/45
  const { ref: sizeRef } = useResizeDetector({
    refreshRate: 0,
    refreshMode: "debounce",
    onResize,
  });

  // panel extensions must notify when they've completed rendering
  // onRender will setRenderDone to a done callback which we can invoke after we've rendered
  const [renderDone, setRenderDone] = useState<() => void>(() => () => {});

  const eligibleTopics = useMemo(() => {
    return topics.filter(topicMessageType).map((topic) => topic.name);
  }, [topics]);

  const settingsActionHandler = useCallback((action: SettingsTreeAction) => {
    if (action.action !== "update") {
      return;
    }

    const { path, input, value } = action.payload;

    if (path[0] === "topics" && input === "boolean") {
      const topic = path[1];
      if (topic) {
        setConfig((oldConfig) => {
          return {
            ...oldConfig,
            disabledTopics:
              value === true
                ? difference(oldConfig.disabledTopics, [topic])
                : union(oldConfig.disabledTopics, [topic]),
          };
        });
      }
    }

    if (path[1] === "layer" && input === "select") {
      setConfig((oldConfig) => {
        return { ...oldConfig, layer: String(value) };
      });
    }

    if (path[1] === "customTileUrl" && input === "string") {
      setConfig((oldConfig) => {
        return { ...oldConfig, customTileUrl: String(value) };
      });
    }
  }, []);

  useEffect(() => {
    if (config.layer === "map") {
      currentMap?.addLayer(tileLayer);
      currentMap?.removeLayer(satelliteLayer);
      currentMap?.removeLayer(customLayer);
    } else if (config.layer === "satellite") {
      currentMap?.addLayer(satelliteLayer);
      currentMap?.removeLayer(tileLayer);
      currentMap?.removeLayer(customLayer);
    } else if (config.layer === "custom") {
      currentMap?.addLayer(customLayer);
      currentMap?.removeLayer(tileLayer);
      currentMap?.removeLayer(satelliteLayer);
    }
  }, [config.layer, currentMap, customLayer, satelliteLayer, tileLayer]);

  useEffect(() => {
    if (config.layer === "custom") {
      // validate URL to avoid leaflet map placeholder variable error
      const placeholders = config.customTileUrl.match(/\{.+?\}/g) ?? [];
      const validPlaceholders = ["{x}", "{y}", "{z}"];
      for (const placeholder of placeholders) {
        if (!validPlaceholders.includes(placeholder)) {
          return;
        }
      }
      customLayer.setUrl(config.customTileUrl);
    }
  }, [config.layer, config.customTileUrl, customLayer]);

  // Subscribe to eligible and enabled topics
  useEffect(() => {
    const eligibleEnabled = difference(eligibleTopics, config.disabledTopics);
    context.subscribe(eligibleEnabled);

    const tree = buildSettingsTree(config, eligibleTopics);
    // eslint-disable-next-line no-underscore-dangle, @typescript-eslint/no-explicit-any
    (context as unknown as any).__updatePanelSettingsTree({
      actionHandler: settingsActionHandler,
      roots: tree,
    });

    return () => {
      context.unsubscribeAll();
    };
  }, [config, context, eligibleTopics, settingsActionHandler]);

  type TopicGroups = {
    baseColor: string;
    topicGroup: LayerGroup;
    currentFrame: FeatureGroup;
    allFrames: FeatureGroup;
  };

  // topic layers is a map of topic -> two feature groups
  // A feature group for all messages markers, and a feature group for current frame markers
  const topicLayers = useMemo(() => {
    const topicLayerMap = new Map<string, TopicGroups>();
    let i = 0;
    for (const topic of eligibleTopics) {
      const allFrames = new FeatureGroup();
      const currentFrame = new FeatureGroup();
      const topicGroup = new LayerGroup([allFrames, currentFrame]);
      topicLayerMap.set(topic, {
        topicGroup,
        allFrames,
        currentFrame,
        baseColor: lineColors[i]!,
      });
      i = (i + 1) % lineColors.length;
    }
    return topicLayerMap;
  }, [eligibleTopics]);

  useLayoutEffect(() => {
    if (!currentMap) {
      return;
    }

    const topicLayerEntries = [...topicLayers.entries()];
    for (const [topic, featureGroups] of topicLayerEntries) {
      // if the topic does not appear in the disabled topics list, add to map so it displays
      if (!config.disabledTopics.includes(topic)) {
        currentMap.addLayer(featureGroups.topicGroup);
      }
    }

    return () => {
      for (const [_topic, featureGroups] of topicLayerEntries) {
        currentMap.removeLayer(featureGroups.topicGroup);
      }
    };
  }, [config.disabledTopics, currentMap, topicLayers]);

  // During the initial mount we setup our context render handler
  useLayoutEffect(() => {
    if (!mapContainerRef.current) {
      return;
    }

    const map = new LeafMap(mapContainerRef.current);

    // the map must be initialized with some view before other features work
    map.setView([0, 0], 10);

    setCurrentMap(map);

    // tell the context we care about updates on these fields
    context.watch("topics");
    context.watch("currentFrame");
    context.watch("allFrames");
    context.watch("previewTime");

    // The render event handler updates the state for our messages an triggers a component render
    //
    // The panel must call the _done_ function passed to render indicating the render completed.
    // The panel will not receive render calls until it calls done.
    context.onRender = (renderState, done) => {
      setRenderDone(() => done);
      setPreviewTime(renderState.previewTime);

      if (renderState.topics) {
        setTopics(renderState.topics);
      }

      if (renderState.allFrames) {
        setAllMapMessages(renderState.allFrames as MapPanelMessage[]);
      }

      // Only update the current frame if we have new messages.
      if (renderState.currentFrame && renderState.currentFrame.length > 0) {
        setCurrentMapMessages(renderState.currentFrame as MapPanelMessage[]);
      }
    };

    return () => {
      map.remove();
      context.onRender = undefined;
    };
  }, [context]);

  const onHover = useCallback(
    (messageEvent?: MessageEvent<unknown>) => {
      context.setPreviewTime(
        messageEvent == undefined ? undefined : toSec(messageEvent.receiveTime),
      );
    },
    [context],
  );

  const onClick = useCallback(
    (messageEvent: MessageEvent<unknown>) => {
      context.seekPlayback?.(toSec(messageEvent.receiveTime));
    },
    [context],
  );

  const addGeoFeatureEventHandlers = useCallback(
    (message: MessageEvent<unknown>, layer: Layer) => {
      layer.on("mouseover", () => {
        onHover(message);
      });
      layer.on("mouseout", () => {
        onHover(undefined);
      });
      layer.on("click", () => {
        onClick(message);
      });
    },
    [onClick, onHover],
  );

  /// --- the remaining code is unrelated to the extension api ----- ///

  const [center, setCenter] = useState<Point | undefined>();
  const [filterBounds, setFilterBounds] = useState<LatLngBounds | undefined>();

  // calculate center point from blocks if we don't have a center point
  useEffect(() => {
    setCenter((old) => {
      // set center only once
      if (old) {
        return old;
      }

      for (const messages of [currentNavMessages, allNavMessages]) {
        for (const message of messages) {
          return {
            lat: message.message.latitude,
            lon: message.message.longitude,
          };
        }
      }

      return;
    });
  }, [allNavMessages, currentNavMessages]);

  useEffect(() => {
    if (!currentMap) {
      return;
    }

    for (const [topic, topicLayer] of topicLayers) {
      topicLayer.allFrames.clearLayers();

      const navMessages = allNavMessages.filter((message) => message.topic === topic);
      const pointLayer = FilteredPointLayer({
        map: currentMap,
        navSatMessageEvents: navMessages,
        bounds: filterBounds ?? currentMap.getBounds(),
        color: lightColor(topicLayer.baseColor),
        hoverColor: darkColor(topicLayer.baseColor),
        onHover,
        onClick,
      });

      topicLayer.allFrames.addLayer(pointLayer);

      const geoMessages = allGeoMessages.filter((message) => message.topic === topic);
      for (const geoMessage of geoMessages) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        geoJSON(JSON.parse(geoMessage.message.geojson), {
          onEachFeature: (_feature, layer) => addGeoFeatureEventHandlers(geoMessage, layer),
        }).addTo(topicLayer.allFrames);
      }
    }
  }, [
    addGeoFeatureEventHandlers,
    allGeoMessages,
    allNavMessages,
    currentMap,
    filterBounds,
    onClick,
    onHover,
    topicLayers,
  ]);

  // create a filtered marker layer for the current nav messages
  // this effect is added after the allNavMessages so the layer appears above
  useEffect(() => {
    if (!currentMap) {
      return;
    }

    for (const [topic, topicLayer] of topicLayers) {
      topicLayer.currentFrame.clearLayers();

      const navMessages = currentNavMessages.filter((message) => message.topic === topic);
      const [fixEvents, noFixEvents] = partition(navMessages, hasFix);

      const pointLayerNoFix = FilteredPointLayer({
        map: currentMap,
        navSatMessageEvents: noFixEvents,
        bounds: filterBounds ?? currentMap.getBounds(),
        color: darkColor(topicLayer.baseColor),
        hoverColor: darkColor(topicLayer.baseColor),
        showAccuracy: true,
      });

      const pointLayerFix = FilteredPointLayer({
        map: currentMap,
        navSatMessageEvents: fixEvents,
        bounds: filterBounds ?? currentMap.getBounds(),
        color: topicLayer.baseColor,
        hoverColor: darkColor(topicLayer.baseColor),
        showAccuracy: true,
      });

      topicLayer.currentFrame.addLayer(pointLayerNoFix);
      topicLayer.currentFrame.addLayer(pointLayerFix);

      const geoMessages = currentGeoMessages.filter((message) => message.topic === topic);
      for (const geoMessage of geoMessages) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        geoJSON(JSON.parse(geoMessage.message.geojson), {
          onEachFeature: (_feature, layer) => addGeoFeatureEventHandlers(geoMessage, layer),
        }).addTo(topicLayer.currentFrame);
      }
    }
  }, [
    addGeoFeatureEventHandlers,
    currentGeoMessages,
    currentMap,
    currentNavMessages,
    filterBounds,
    topicLayers,
  ]);

  // create a marker for the closest gps message to our current preview time
  useEffect(() => {
    if (!currentMap || previewTime == undefined) {
      return;
    }

    // get the point occuring most recently before preview time but not after preview time
    const prevNavMessages = allNavMessages.filter(
      (message) => toSec(message.receiveTime) < previewTime,
    );
    const event = minBy(prevNavMessages, (message) => previewTime - toSec(message.receiveTime));
    if (!event) {
      return;
    }

    const topicLayer = topicLayers.get(event.topic);

    const marker = new CircleMarker([event.message.latitude, event.message.longitude], {
      radius: POINT_MARKER_RADIUS,
      color: topicLayer ? darkColor(topicLayer.baseColor) : undefined,
      stroke: false,
      fillOpacity: 1,
      interactive: false,
    });

    marker.addTo(currentMap);
    return () => {
      marker.remove();
    };
  }, [allNavMessages, currentMap, previewTime, topicLayers]);

  // persist panel config on zoom changes
  useEffect(() => {
    if (!currentMap) {
      return;
    }

    const zoomChange = () => {
      context.saveState({
        zoomLevel: currentMap.getZoom(),
      });
    };

    currentMap.on("zoom", zoomChange);
    return () => {
      currentMap.off("zoom", zoomChange);
    };
  }, [context, currentMap]);

  useEffect(() => {
    context.saveState(config);
  }, [context, config]);

  // we don't want to invoke filtering on every user map move so we rate limit to 100ms
  const moveHandler = useDebouncedCallback(
    (map: LeafMap) => {
      setFilterBounds(map.getBounds());
    },
    100,
    // maxWait equal to debounce timeout makes the debounce act like a throttle
    // Without a maxWait - invocations of the debounced invalidate reset the countdown
    // resulting in no invalidation when scales are constantly changing (playback)
    { leading: false, maxWait: 100 },
  );

  // setup handler for map move events to re-filter points
  // this also handles zoom changes
  useEffect(() => {
    if (!currentMap) {
      return;
    }

    const handler = () => moveHandler(currentMap);
    currentMap.on("move", handler);
    return () => {
      currentMap.off("move", handler);
    };
  }, [currentMap, moveHandler]);

  // Update the map view when centerpoint changes
  useEffect(() => {
    if (!center) {
      return;
    }

    currentMap?.setView([center.lat, center.lon], config.zoomLevel ?? 10);
  }, [center, config.zoomLevel, currentMap]);

  // Indicate render is complete - the effect runs after the dom is updated
  useEffect(() => {
    renderDone();
  }, [renderDone]);

  return (
    <div ref={sizeRef} style={{ width: "100%", height: "100%" }}>
      {!center && <EmptyState>Waiting for first GPS point...</EmptyState>}
      <div
        ref={mapContainerRef}
        style={{ width: "100%", height: "100%", visibility: center ? "visible" : "hidden" }}
      />
    </div>
  );
}

export default MapPanel;
