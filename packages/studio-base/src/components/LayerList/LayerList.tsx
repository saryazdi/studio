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
  Checkbox,
  CheckboxProps,
} from "@mui/material";
import { useState } from "react";

import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@foxglove/studio-base/components/MessagePipeline";
import Stack from "@foxglove/studio-base/components/Stack";
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

const VisibilityToggleIcon = (props: CheckboxProps) => (
  <Checkbox
    defaultChecked
    {...props}
    icon={
      <SvgIcon viewBox="0 0 16 16" color="disabled">
        {/* Eye open */}
        <path
          fill="currentColor"
          d="M13.508 7.801c.556-.527 1.036-1.134 1.422-1.801h-1.185C12.48 7.814 10.378 9 8 9 5.622 9 3.52 7.814 2.254 6H1.07c.386.667.866 1.274 1.421 1.801L.896 9.396l.708.707L3.26 8.446c.71.523 1.511.932 2.374 1.199l-.617 2.221.964.268.626-2.255C7.06 9.96 7.525 10 8 10c.475 0 .94-.041 1.392-.12l.626 2.254.964-.268-.617-2.221c.863-.267 1.663-.676 2.374-1.2l1.657 1.658.708-.707-1.595-1.595z"
          fillRule="nonzero"
        />
      </SvgIcon>
    }
    checkedIcon={
      <SvgIcon viewBox="0 0 16 16">
        {/* Eye closed */}
        <g fill="currentColor">
          <path
            d="M8 10c1.105 0 2-.895 2-2 0-1.105-.895-2-2-2-1.104 0-2 .895-2 2 0 1.105.896 2 2 2z"
            fillRule="nonzero"
          />
          <path
            d="M8 4c2.878 0 5.378 1.621 6.635 4-1.257 2.379-3.757 4-6.635 4-2.878 0-5.377-1.621-6.635-4C2.623 5.621 5.122 4 8 4zm0 7c-2.3 0-4.322-1.194-5.478-3C3.678 6.194 5.7 5 8 5c2.3 0 4.322 1.194 5.479 3C12.322 9.806 10.3 11 8 11z"
            fillRule="evenodd"
          />
        </g>
      </SvgIcon>
    }
  />
);

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
          secondaryAction={<VisibilityToggleIcon edge="end" color="default" />}
        />
        <Divider />
        <Layer
          defaultOpen
          primary="Background"
          icon={<LayersIcon />}
          properties={[{ label: "Color", defaultValue: "#000000", variant: "color" }]}
          secondaryAction={<VisibilityToggleIcon edge="end" color="default" />}
        />
        <Divider />
        <Layer
          defaultOpen
          icon={<MapIcon />}
          primary="Map"
          secondaryAction={<VisibilityToggleIcon edge="end" color="default" />}
          properties={[
            {
              label: "Message path",
              variant: "string",
              defaultValue: "/gps/fix",
            },
            {
              label: "Map style",
              defaultValue: "Open Street Maps",
              variant: "select",
              options: [
                "Open Street Maps",
                "Stadia Maps (Adelaide Smooth Light)",
                "Stadia Maps (Adelaide Smooth Dark)",
                "Custom",
              ],
            },
            {
              label: "API key (optional)",
              variant: "string",
            },
            {
              label: "Color by",
              defaultValue: "Flat",
              variant: "toggle",
              options: ["Flat", "Point data"],
            },
            {
              label: "Marker color",
              variant: "color",
              defaultValue: "#ff0000",
            },
          ]}
        />
        <Divider />
        <Layer
          defaultOpen
          primary="Grid"
          icon={<GridIcon />}
          properties={[
            { label: "Color", defaultValue: "#248eff", variant: "color" },
            { label: "Size", defaultValue: 10, variant: "number" },
            { label: "Subdivision", defaultValue: 9, variant: "number" },
          ]}
          secondaryAction={<VisibilityToggleIcon edge="end" color="default" />}
        />
        <Divider />
        <Layer
          defaultOpen
          primary="3D Model"
          icon={<CubeIcon />}
          properties={[{ label: "Color", defaultValue: "#8166E8bb", variant: "color" }]}
          secondaryAction={<VisibilityToggleIcon edge="end" color="default" />}
        />
        <Divider />
        <Layer
          defaultOpen
          primary="Pose"
          icon={<CubeIcon />}
          properties={[
            { label: "Color", defaultValue: "#ffffff", variant: "color" },
            { label: "Shaft length", defaultValue: 1.5, variant: "number" },
            { label: "Shaft width", defaultValue: 1.5, variant: "number" },
            { label: "Head length", defaultValue: 2, variant: "number" },
            { label: "Head width", defaultValue: 2, variant: "number" },
          ]}
          secondaryAction={<VisibilityToggleIcon edge="end" color="default" />}
        />
        <Divider />
        <LayerGroup
          primary="TF"
          secondaryAction={<VisibilityToggleIcon edge="end" color="default" />}
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
          ].map((key) => ({
            key,
            primary: key,
            secondaryAction: <VisibilityToggleIcon edge="end" color="default" />,
          }))}
        />
        <Divider />
        <LayerGroup
          defaultOpen
          primary="Topics"
          secondaryAction={<VisibilityToggleIcon edge="end" color="default" />}
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
                  secondaryAction: <VisibilityToggleIcon edge="end" color="default" />,
                  items: [
                    {
                      key: "/semantic_map/centerline",
                      primary: "centerline",
                      secondaryAction: <VisibilityToggleIcon edge="end" color="default" />,
                    },
                  ],
                }
              : {
                  key,
                  primary: key,
                  secondaryAction: <VisibilityToggleIcon edge="end" color="default" />,
                },
          )}
        />
        <Divider />
        <Layer
          primary="/LIDAR_TOP"
          icon={<ScanIcon />}
          secondaryAction={<VisibilityToggleIcon edge="end" color="default" />}
          properties={[
            { label: "Point size", defaultValue: 2, variant: "number" },
            {
              label: "Point shape",
              defaultValue: "Circle",
              variant: "toggle",
              options: ["Circle", "Square"],
            },
            { label: "Decay time (seconds)", defaultValue: 0, variant: "number" },
            {
              label: "Color by",
              defaultValue: "Point data",
              variant: "toggle",
              options: ["Flat", "Point data"],
            },
            {
              label: "Min value",
              variant: "number",
              placeholder: "auto",
            },
            {
              label: "Max value",
              variant: "number",
              placeholder: "auto",
            },
            {
              label: "Color scale",
              variant: "gradient",
            },
          ]}
        />
      </List>
    </Stack>
  );
}
