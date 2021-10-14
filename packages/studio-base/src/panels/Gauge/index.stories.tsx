// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Story, StoryContext } from "@storybook/react";

import PanelSetup from "@foxglove/studio-base/stories/PanelSetup";

import GaugePanel from "./index";

export default {
  title: "panels/Gauge/index",
  component: GaugePanel,
  decorators: [
    (StoryComponent: Story, { parameters }: StoryContext): JSX.Element => {
      return (
        <PanelSetup fixture={parameters.panelSetup?.fixture}>
          <StoryComponent />
        </PanelSetup>
      );
    },
  ],
};

export const EmptyState = (): JSX.Element => {
  return <GaugePanel />;
};

export const SinglePoint = (): JSX.Element => {
  return <GaugePanel />;
};

SinglePoint.parameters = {
  chromatic: {
    delay: 1000,
  },
  panelSetup: {
    fixture: {
      topics: [{ name: "/gps", datatype: "sensor_msgs/NavSatFix" }],
      frame: {
        "/gps": [
          {
            topic: "/gps",
            receiveTime: { sec: 123, nsec: 456 },
            message: {
              latitude: 0,
              longitude: 0,
            },
          },
        ],
      },
    },
  },
};

export const MultipleTopics = (): JSX.Element => {
  return <GaugePanel />;
};

MultipleTopics.parameters = {
  chromatic: {
    delay: 1000,
  },
  panelSetup: {
    fixture: {
      topics: [
        { name: "/gps", datatype: "sensor_msgs/NavSatFix" },
        { name: "/another-gps-topic", datatype: "sensor_msgs/NavSatFix" },
      ],
      frame: {
        "/gps": [
          {
            topic: "/gps",
            receiveTime: { sec: 123, nsec: 456 },
            message: {
              latitude: 0,
              longitude: 0,
            },
          },
        ],
        "/another-gps-topic": [
          {
            topic: "/another-gps-topic",
            receiveTime: { sec: 123, nsec: 456 },
            message: {
              latitude: 0.1,
              longitude: 0.1,
            },
          },
        ],
      },
    },
  },
};