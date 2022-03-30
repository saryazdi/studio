// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import AddIcon from "@mui/icons-material/Add";
import ClearIcon from "@mui/icons-material/Clear";
import GridIcon from "@mui/icons-material/GridOnSharp";
import LayersIcon from "@mui/icons-material/Layers";
import MapIcon from "@mui/icons-material/Map";
import SearchIcon from "@mui/icons-material/Search";
import {
  AppBar,
  CircularProgress,
  Divider,
  IconButton,
  List,
  Skeleton,
  SvgIcon,
  SvgIconProps,
  TextField,
  Typography,
  styled as muiStyled,
} from "@mui/material";
import { useState } from "react";

import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@foxglove/studio-base/components/MessagePipeline";
import Stack from "@foxglove/studio-base/components/Stack";
import VisibilityToggle from "@foxglove/studio-base/panels/ThreeDimensionalViz/TopicTree/VisibilityToggle";
import { PlayerPresence } from "@foxglove/studio-base/players/types";

import { Layer } from "./Layer";
import { LayerGroup } from "./LayerGroup";

const CubeIcon = (props: SvgIconProps): JSX.Element => (
  <SvgIcon {...props}>
    <path
      fill="currentColor"
      d="M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5M12,4.15L6.04,7.5L12,10.85L17.96,7.5L12,4.15M5,15.91L11,19.29V12.58L5,9.21V15.91M19,15.91V9.21L13,12.58V19.29L19,15.91Z"
    />
  </SvgIcon>
);

const ScanIcon = (props: SvgIconProps): JSX.Element => (
  <SvgIcon {...props}>
    <path
      d="M2 5.75A2.75 2.75 0 0 1 4.75 3h1.5a.75.75 0 0 1 0 1.5h-1.5c-.69 0-1.25.56-1.25 1.25v1.5a.75.75 0 0 1-1.5 0v-1.5Zm15-2a.75.75 0 0 1 .75-.75h1.5A2.75 2.75 0 0 1 22 5.75v1.5a.75.75 0 0 1-1.5 0v-1.5c0-.69-.56-1.25-1.25-1.25h-1.5a.75.75 0 0 1-.75-.75ZM2.75 16a.75.75 0 0 1 .75.75v1.5c0 .69.56 1.25 1.25 1.25h1.5a.75.75 0 0 1 0 1.5h-1.5A2.75 2.75 0 0 1 2 18.25v-1.5a.75.75 0 0 1 .75-.75Zm18.5 0a.75.75 0 0 1 .75.75v1.5A2.75 2.75 0 0 1 19.25 21h-1.5a.75.75 0 0 1 0-1.5h1.5c.69 0 1.25-.56 1.25-1.25v-1.5a.75.75 0 0 1 .75-.75ZM5.75 7a.75.75 0 0 1 .75.75v8.5a.75.75 0 0 1-1.5 0v-8.5A.75.75 0 0 1 5.75 7Zm4.75.75a.75.75 0 0 0-1.5 0v8.5a.75.75 0 0 0 1.5 0v-8.5ZM13.75 7a.75.75 0 0 1 .75.75v8.5a.75.75 0 0 1-1.5 0v-8.5a.75.75 0 0 1 .75-.75Zm4.75.75a.75.75 0 0 0-1.5 0v8.5a.75.75 0 0 0 1.5 0v-8.5Z"
      fill="currentColor"
    />
  </SvgIcon>
);

const StyledAppBar = muiStyled(AppBar, { skipSx: true })(({ theme }) => ({
  top: -1,
  zIndex: theme.zIndex.appBar - 1,
  borderBottom: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(1),
}));

const selectPlayerPresence = ({ playerState }: MessagePipelineContext) => playerState.presence;

export function LayerList(): JSX.Element {
  const [filterText, setFilterText] = useState<string>("");
  const playerPresence = useMessagePipeline(selectPlayerPresence);

  if (playerPresence === PlayerPresence.ERROR) {
    return (
      <Stack flex="auto" padding={2} fullHeight alignItems="center" justifyContent="center">
        <Typography align="center" color="text.secondary">
          An error occurred
        </Typography>
      </Stack>
    );
  }

  if (
    playerPresence === PlayerPresence.INITIALIZING ||
    playerPresence === PlayerPresence.RECONNECTING
  ) {
    return (
      <>
        <StyledAppBar position="sticky" color="default" elevation={0}>
          <TextField
            disabled
            variant="filled"
            fullWidth
            placeholder="Filter by topic or datatype"
            InputProps={{
              startAdornment: <SearchIcon fontSize="small" />,
              endAdornment: <CircularProgress size={20} />,
            }}
          />
        </StyledAppBar>
        <List key="loading" dense disablePadding>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((i) => (
            <Layer key={i} primary={<Skeleton animation={false} width="20%" />} divider />
          ))}
        </List>
      </>
    );
  }

  return (
    <Stack fullHeight>
      <StyledAppBar position="sticky" color="default" elevation={0}>
        <TextField
          disabled={playerPresence !== PlayerPresence.PRESENT}
          onChange={(event) => setFilterText(event.target.value)}
          value={filterText}
          variant="filled"
          fullWidth
          placeholder="Filter by layer name"
          InputProps={{
            startAdornment: <SearchIcon fontSize="small" />,
            endAdornment: filterText && (
              <IconButton
                size="small"
                title="Clear search"
                onClick={() => setFilterText("")}
                edge="end"
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            ),
          }}
        />
      </StyledAppBar>
      <List disablePadding dense>
        {/* TODO: I am mock data */}
        <Layer
          icon={<AddIcon />}
          primary="Add layer"
          secondaryAction={<VisibilityToggle available checked />}
        />
        <Divider />
        <Layer
          defaultOpen
          primary="Background"
          icon={<LayersIcon />}
          options={[{ label: "Color", defaultValue: "#000000", type: "color" }]}
          secondaryAction={<VisibilityToggle available checked />}
        />
        <Divider />
        <Layer
          icon={<MapIcon />}
          primary="Map"
          secondaryAction={<VisibilityToggle available checked />}
        />
        <Divider />
        <Layer
          defaultOpen
          primary="Grid"
          icon={<GridIcon />}
          options={[
            { label: "Color", defaultValue: "#248eff", type: "color" },
            { label: "Size", defaultValue: 10, type: "number" },
            { label: "Subdivision", defaultValue: 9, type: "number" },
          ]}
          secondaryAction={<VisibilityToggle available checked />}
        />
        <Divider />
        <Layer
          primary="3D Model"
          icon={<CubeIcon />}
          options={[{ label: "Color", defaultValue: "#8166E8bb", type: "color" }]}
          secondaryAction={<VisibilityToggle available checked />}
        />
        <Divider />
        <Layer
          primary="Pose"
          icon={<CubeIcon />}
          options={[
            { label: "Color", defaultValue: "#ffffff", type: "color" },
            { label: "Shaft length", defaultValue: 1.5, type: "number" },
            { label: "Shaft width", defaultValue: 1.5, type: "number" },
            { label: "Head length", defaultValue: 2, type: "number" },
            { label: "Head width", defaultValue: 2, type: "number" },
          ]}
          secondaryAction={<VisibilityToggle available checked />}
        />
        <Divider />
        <LayerGroup
          divider
          primary="TF"
          secondaryAction={<VisibilityToggle available checked />}
          items={[
            "/map",
            "/tf",
            "/drivable_area",
            "/RADAR_FRONT",
            "/RADAR_FRONT_LEFT",
            "/RADAR_FRONT_RIGHT",
            "/RADAR_BACK_LEFT",
            "/RADAR_BACK_RIGHT",
            "/LIDAR_TOP",
            "/CAM_FRONT/camera_info",
            "/CAM_FRONT_RIGHT/camera_info",
            "/CAM_BACK_RIGHT/camera_info",
            "/CAM_BACK/camera_info",
            "/CAM_BACK_LEFT/camera_info",
          ].map((i) => ({
            key: i,
            primary: i,
            secondaryAction: <VisibilityToggle available checked />,
          }))}
        />
        <LayerGroup
          divider
          defaultOpen
          primary="Topics"
          secondaryAction={<VisibilityToggle available checked />}
          items={[
            "/map",
            "/semantic_map",
            "/drivable_area",
            "/RADAR_FRONT",
            "/RADAR_FRONT_LEFT",
            "/RADAR_FRONT_RIGHT",
            "/RADAR_BACK_LEFT",
            "/RADAR_BACK_RIGHT",
            "/markers",
            "/annotations",
          ].map((key) =>
            key === "/semantic_map"
              ? {
                  key,
                  primary: key,
                  defaultOpen: true,
                  secondaryAction: <VisibilityToggle available checked />,
                  items: [
                    {
                      key: "/semantic_map/centerline",
                      primary: "centerline",
                      secondaryAction: <VisibilityToggle available checked />,
                    },
                  ],
                }
              : {
                  key,
                  primary: key,
                  secondaryAction: <VisibilityToggle available checked />,
                },
          )}
        />
        <Layer
          primary="/LIDAR_TOP"
          icon={<ScanIcon />}
          secondaryAction={<VisibilityToggle available checked />}
          options={[
            { label: "Point size", defaultValue: 2, type: "number" },
            {
              label: "Point shape",
              defaultValue: "Circle",
              type: "enum",
              values: ["Circle", "Square"],
            },
            { label: "Decay time (seconds)", defaultValue: 0, type: "number" },
            {
              label: "Color by",
              defaultValue: "Point data",
              type: "enum",
              values: ["Flat", "Point data"],
            },
            {
              label: "Min value",
              type: "number",
              placeholder: "auto",
            },
            {
              label: "Max value",
              type: "number",
              placeholder: "auto",
            },
            {
              label: "Color scale",
              type: "gradient",
            },
          ]}
        />
      </List>
    </Stack>
  );
}
