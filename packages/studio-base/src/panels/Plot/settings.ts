// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { SettingsTreeRoots } from "@foxglove/studio-base/components/SettingsTreeEditor/types";

import { PlotConfig } from "./types";

export function buildSettingsTree(config: PlotConfig): SettingsTreeRoots {
  return {
    general: {
      label: "General",
      icon: "Settings",
      fields: {
        title: { label: "Title", input: "string", value: config.title },
        isSynced: { label: "Sync with other plots", input: "boolean", value: config.isSynced },
        legendDisplay: {
          label: "Legend position",
          input: "select",
          value: config.legendDisplay,
          options: [
            { value: "floating", label: "Floating" },
            { value: "left", label: "Left" },
            { value: "top", label: "Top" },
          ],
        },
        showPlotValuesInLegend: {
          label: "Show plot values in legend",
          input: "boolean",
          value: config.showPlotValuesInLegend,
        },
        showXAxisLabels: {
          label: "Show X axis labels",
          input: "boolean",
          value: config.showXAxisLabels,
        },
        showYAxisLabels: {
          label: "Show Y axis labels",
          input: "boolean",
          value: config.showYAxisLabels,
        },
        minYValue: {
          label: "Y min",
          input: "number",
          value: config.minYValue != undefined ? Number(config.minYValue) : undefined,
          placeholder: "auto",
        },
        maxYValue: {
          label: "Y max",
          input: "number",
          value: config.maxYValue != undefined ? Number(config.maxYValue) : undefined,
          placeholder: "auto",
        },
      },
    },
    timeSeriesOnly: {
      label: "Time series only",
      fields: {
        followingViewWidth: {
          label: "X range (seconds)",
          input: "number",
          placeholder: "auto",
          value: config.followingViewWidth,
        },
      },
    },
  };
}
