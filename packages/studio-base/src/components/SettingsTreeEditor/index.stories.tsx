// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Box } from "@mui/material";
import produce from "immer";
import { last } from "lodash";
import { useCallback, useMemo, useState, useEffect } from "react";

import { MessagePathInputStoryFixture } from "@foxglove/studio-base/components/MessagePathSyntax/fixture";
import MockPanelContextProvider from "@foxglove/studio-base/components/MockPanelContextProvider";
import SettingsTreeEditor from "@foxglove/studio-base/components/SettingsTreeEditor";
import PanelSetup from "@foxglove/studio-base/stories/PanelSetup";

import {
  SettingsTreeNode,
  SettingsTreeRoots,
  SettingsTreeFieldValue,
  SettingsTreeAction,
} from "./types";

export default {
  title: "components/SettingsTreeEditor",
  component: SettingsTreeEditor,
};

const BasicSettings: SettingsTreeRoots = {
  general: {
    label: "General",
    icon: "Settings",
    visible: true,
    actions: [
      { id: "add-grid", label: "Add new grid", icon: "Grid" },
      { id: "add-background", label: "Add new background", icon: "Background" },
      { id: "reset-values", label: "Reset values" },
    ],
    fields: {
      numberWithPrecision: {
        input: "number",
        label: "Number with precision",
        value: 1.2345789,
        precision: 4,
      },
      gradient: { input: "gradient", label: "Gradient" },
      emptyNumber: { input: "number", label: "Empty Number" },
      fieldWithError: {
        input: "string",
        label: "Field With Error",
        error: "This field has an error message that should be displayed to the user",
      },
    },
    children: {},
  },
  complex_inputs: {
    label: "Complex Inputs",
    icon: "Hive",
    visible: true,
    fields: {
      messagepath: {
        label: "Message Path",
        input: "messagepath",
      },
      topic: {
        label: "Topic",
        input: "autocomplete",
        items: ["topic1", "topic2", "topic3"],
      },
      vec3: {
        label: "Vec3",
        input: "vec3",
        labels: ["U", "V", "W"],
        value: [1.1111, 2.2222, 3.3333],
        precision: 2,
        step: 2,
      },
      emptySelect: {
        label: "Empty Select",
        value: "",
        input: "select",
        options: [
          { label: "Nothing", value: "" },
          { label: "Something", value: "something" },
        ],
      },
    },
  },
  emptyNode: {
    label: "Empty node",
  },
  defaultCollapsed: {
    label: "Default Collapsed",
    defaultExpansionState: "collapsed",
    visible: true,
    fields: {
      field: { label: "Field", input: "string" },
    },
  },
  background: {
    label: "Background",
    icon: "Background",
    visible: true,
    fields: {
      colorRGB: { label: "Color RGB", value: "#000000", input: "rgb" },
      colorRGBA: { label: "Color RGBA", value: "rgba(0, 128, 255, 0.75)", input: "rgba" },
    },
  },
  threeDimensionalModel: {
    label: "3D Model",
    icon: "Cube",
    visible: true,
    fields: {
      color: {
        label: "Color",
        input: "rgb",
        value: "#9480ed",
      },
      url: {
        label: "Model URL (URDF)",
        input: "string",
        placeholder: "https://example.com/.../model.urdf",
        value: "",
        help: `URL pointing to a Unified Robot Description Format (URDF) XML file.
For ROS users, we also support package:// URLs
(loaded from the local filesystem) in our desktop app.`,
      },
    },
  },
};

const PanelExamplesSettings: SettingsTreeRoots = {
  map: {
    label: "Map",
    icon: "Map",
    fields: {
      message_path: {
        label: "Message path",
        input: "string",
        value: "/gps/fix",
      },
      style: {
        label: "Map style",
        value: "Open Street Maps",
        input: "select",
        options: [
          { label: "Open Street Maps", value: "Open Street Maps" },
          {
            label: "Stadia Maps (Adelaide Smooth Light)",
            value: "Stadia Maps (Adelaide Smooth Light)",
          },
          {
            label: "Stadia Maps (Adelaide Smooth Dark)",
            value: "Stadia Maps (Adelaide Smooth Dark)",
          },
          { label: "Custom", value: "Custom" },
        ],
      },
      api_key: {
        label: "API key (optional)",
        input: "string",
      },
      color_by: {
        label: "Color by",
        value: "Flat",
        input: "toggle",
        options: ["Flat", "Point data"],
      },
      marker_color: {
        label: "Marker color",
        input: "rgb",
        value: "#ff0000",
      },
    },
  },
  grid: {
    label: "Grid",
    icon: "Grid",
    fields: {
      color: {
        label: "Color",
        value: "#248eff",
        input: "rgb",
      },
      size: {
        label: "Size",
        value: undefined,
        input: "number",
        max: 10,
        min: 1,
      },
      subdivision: {
        label: "Subdivision",
        input: "number",
        value: 9,
      },
      frame_lock: {
        label: "Frame lock",
        input: "boolean",
        value: false,
        help: "When enabled, the map will not be updated when the robot moves.",
      },
    },
  },
  pose: {
    label: "Pose",
    icon: "Walk",
    fields: {
      color: { label: "Color", value: "#ffffff", input: "rgb" },
      shaft_length: { label: "Shaft length", value: 1.5, input: "number" },
      shaft_width: { label: "Shaft width", value: 1.5, input: "number" },
      head_length: { label: "Head length", value: 2, input: "number" },
      head_width: { label: "Head width", value: 2, input: "number" },
    },
  },
};

const TopicSettings: SettingsTreeRoots = {
  topics: {
    label: "Topics",
    icon: "Topic",
    visible: true,
    children: {
      drivable_area: {
        label: "/drivable_area",
        visible: true,
        fields: {
          frame_lock: {
            label: "Frame lock",
            input: "boolean",
            value: false,
            help: "When enabled, the map will not be updated when the robot moves.",
          },
        },
      },
      map: {
        label: "/map",
        fields: {
          frame_lock: {
            label: "Frame lock",
            input: "boolean",
            value: false,
            help: "When enabled, the map will not be updated when the robot moves.",
          },
        },
      },
      semantic_map: {
        label: "/semantic_map",
        fields: {
          color: {
            label: "Color",
            value: "#00ff00",
            input: "rgb",
          },
          click_handling: {
            label: "Selection mode",
            value: "Line",
            input: "select",
            options: [
              { value: "Line", label: "Line" },
              { value: "Enclosed polygons", label: "Enclosed polygons" },
            ],
            help: `Treating line markers as polygons. Clicking inside the lines in the
                marker selects the marker. The default behavior for line markers requires the
                user to click exactly on the line to select the line marker.
                Enabling this feature can reduce performance.`,
          },
        },
        children: {
          centerline: {
            label: "centerline",
            fields: {
              color: {
                label: "Color",
                value: "#00ff00",
                input: "rgb",
              },
            },
          },
        },
      },
      lidar_top: {
        label: "/LIDAR_TOP",
        fields: {
          point_size: {
            label: "Point Size",
            input: "number",
            step: 0.1,
            value: 2,
          },
          point_shape: {
            label: "Point Shape",
            input: "toggle",
            value: "Circle",
            options: ["Circle", "Square"],
          },
          decay_time: {
            label: "Decay Time (seconds)",
            input: "number",
            value: 0,
          },
        },
      },
      lidar_left: {
        label: "/LIDAR_LEFT",
        fields: {
          point_size: {
            label: "Point Size",
            input: "number",
            step: 2,
            value: 2,
          },
          point_shape: {
            label: "Point Shape",
            input: "toggle",
            value: "Circle",
            options: ["Circle", "Square"],
          },
          decay_time: {
            label: "Decay Time (seconds)",
            input: "number",
            value: 0,
          },
        },
      },
    },
  },
};

function updateSettingsTreeRoots(
  previous: SettingsTreeRoots,
  path: readonly string[],
  value: unknown,
): SettingsTreeRoots {
  const workingPath = [...path];
  return produce(previous, (draft) => {
    let node: undefined | Partial<SettingsTreeNode> = draft[workingPath[0]!];
    workingPath.shift();

    while (node != undefined && workingPath.length > 1) {
      const key = workingPath.shift()!;
      node = node.children?.[key];
    }

    if (!node) {
      return;
    }

    const key = workingPath.shift()!;
    if (key === "visible") {
      node.visible = Boolean(value);
    } else {
      const field = node.fields?.[key];
      if (field != undefined) {
        field.value = value as SettingsTreeFieldValue["value"];
      }
    }
  });
}

function makeBackgroundNode(index: number): SettingsTreeNode {
  return {
    label: `Background ${index}`,
    icon: "Background",
    fields: {
      url: { label: "URL", input: "string", value: "http://example.com/img.jpg" },
    },
    actions: [{ id: "remove-background", label: "Remove Background" }],
  };
}

function makeGridNode(index: number): SettingsTreeNode {
  return {
    label: `Grid ${index}`,
    icon: "Grid",
    fields: {
      xsize: { label: "X Size", input: "number", value: 1 },
      ysize: { label: "Y Size", input: "number", value: 2 },
    },
    actions: [{ id: "remove-grid", label: "Remove Grid" }],
  };
}

function Wrapper({ roots }: { roots: SettingsTreeRoots }): JSX.Element {
  const [settingsRoots, setSettingsRoots] = useState({ ...roots });
  const [dynamicNodes, setDynamicNodes] = useState<Record<string, SettingsTreeNode>>({});

  const actionHandler = useCallback(
    (action: SettingsTreeAction) => {
      if (action.action === "perform-node-action") {
        if (action.payload.id === "add-grid") {
          const nodeCount = Object.keys(dynamicNodes).length;
          setDynamicNodes((oldNodes) => ({
            ...oldNodes,
            [`grid${nodeCount + 1}`]: makeGridNode(nodeCount + 1),
          }));
        }
        if (action.payload.id === "add-background") {
          const nodeCount = Object.keys(dynamicNodes).length;
          setDynamicNodes((oldNodes) => ({
            ...oldNodes,
            [`background{nodeCount + 1}`]: makeBackgroundNode(nodeCount + 1),
          }));
        }
        if (action.payload.id === "remove-grid" || action.payload.id === "remove-background") {
          setDynamicNodes((oldNodes) => {
            const newNodes = { ...oldNodes };
            delete newNodes[last(action.payload.path)!];
            return newNodes;
          });
        }
        return;
      }

      setSettingsRoots((previous) =>
        updateSettingsTreeRoots(previous, action.payload.path, action.payload.value),
      );
    },
    [dynamicNodes],
  );

  const settingsTree = useMemo(
    () => ({
      actionHandler,
      enableFilter: true,
      roots: settingsRoots,
    }),
    [settingsRoots, actionHandler],
  );

  useEffect(() => {
    setSettingsRoots(
      produce((draft) => {
        if ("general" in draft) {
          (draft as any).general.children = dynamicNodes;
        }
      }),
    );
  }, [dynamicNodes]);

  return (
    <MockPanelContextProvider>
      <PanelSetup fixture={MessagePathInputStoryFixture}>
        <Box
          display="flex"
          flexDirection="column"
          width="100%"
          bgcolor="background.paper"
          overflow="auto"
        >
          <SettingsTreeEditor settings={settingsTree} />
        </Box>
      </PanelSetup>
    </MockPanelContextProvider>
  );
}

export function Basics(): JSX.Element {
  return <Wrapper roots={BasicSettings} />;
}

export function PanelExamples(): JSX.Element {
  return <Wrapper roots={PanelExamplesSettings} />;
}

export function Topics(): JSX.Element {
  return <Wrapper roots={TopicSettings} />;
}
