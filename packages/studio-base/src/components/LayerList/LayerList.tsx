// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import AddIcon from "@mui/icons-material/Add";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ClearIcon from "@mui/icons-material/Clear";
import GridIcon from "@mui/icons-material/GridOnSharp";
import LayersIcon from "@mui/icons-material/Layers";
import MapIcon from "@mui/icons-material/Map";
import SearchIcon from "@mui/icons-material/Search";
import {
  AppBar,
  CircularProgress,
  IconButton,
  List,
  Skeleton,
  SvgIcon,
  SvgIconProps,
  TextField,
  Typography,
  styled as muiStyled,
  Divider,
  Box,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  InputBase,
  ButtonBase,
  Select,
  MenuItem,
} from "@mui/material";
import { useState } from "react";

import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@foxglove/studio-base/components/MessagePipeline";
import Stack from "@foxglove/studio-base/components/Stack";
import { PlayerPresence } from "@foxglove/studio-base/players/types";
import { fonts } from "@foxglove/studio-base/util/sharedStyleConstants";

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
        {/* FIXME: I am mock data */}
        <Layer divider icon={<AddIcon />} primary="Add layer" />
        <Layer divider icon={<LayersIcon />} primary="Background" />
        <Stack
          direction="row"
          paddingY={0.5}
          paddingRight={2}
          paddingLeft={6.5}
          alignItems="center"
          justifyContent="space-between"
          gap={2}
        >
          <Typography variant="subtitle2">Color</Typography>
          <Stack direction="row" gap={0.5}>
            <TextField
              size="small"
              value="#000000"
              InputProps={{
                startAdornment: (
                  <ButtonBase>
                    <Box
                      bgcolor="#000000"
                      height={16}
                      width={16}
                      borderRadius={1}
                      marginLeft={-0.25}
                      sx={{
                        outline: "1px solid",
                        outlineColor: "actions.hover",
                      }}
                    />
                  </ButtonBase>
                ),
                sx: {
                  paddingY: "1px",
                },
              }}
            />
            <Select size="small" value={10}>
              <MenuItem value={10}>RGBA</MenuItem>
              <MenuItem value={20}>HEX</MenuItem>
              <MenuItem value={30}>HSL</MenuItem>
            </Select>
          </Stack>
        </Stack>
        <Stack
          direction="row"
          paddingY={0.5}
          paddingRight={2}
          paddingLeft={6.5}
          alignItems="center"
          justifyContent="space-between"
          gap={2}
        >
          <Typography variant="subtitle2">Width</Typography>
          <Stack direction="row" gap={0.5}>
            <Box>
              <ToggleButton size="small">
                <ChevronLeftIcon fontSize="small" />
              </ToggleButton>
              <TextField size="small" />
              <ToggleButton size="small">
                <ChevronRightIcon fontSize="small" />
              </ToggleButton>
            </Box>
          </Stack>
        </Stack>
        <Divider />
        <Layer divider icon={<MapIcon />} primary="Map" />
        <Layer divider icon={<GridIcon />} primary="Grid" />
        <Stack
          direction="row"
          paddingY={0.5}
          paddingRight={2}
          paddingLeft={6.5}
          alignItems="center"
          justifyContent="space-between"
          gap={2}
        >
          <Typography variant="subtitle2">Color</Typography>
          <Stack direction="row" gap={0.5}>
            <TextField
              size="small"
              value="#248eff"
              InputProps={{
                startAdornment: (
                  <ButtonBase>
                    <Box
                      bgcolor="#248eff"
                      height={16}
                      width={16}
                      borderRadius={1}
                      marginLeft={-0.25}
                    />
                  </ButtonBase>
                ),
                sx: {
                  paddingY: "1px",
                },
              }}
            />
            <Select size="small" value={10}>
              <MenuItem value={10}>RGBA</MenuItem>
              <MenuItem value={20}>HEX</MenuItem>
              <MenuItem value={30}>HSL</MenuItem>
            </Select>
          </Stack>
        </Stack>
        <Divider />
        <Layer divider icon={<CubeIcon />} primary="3D Model" />
        <LayerGroup
          divider
          primary="TF"
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
          }))}
        />
        <LayerGroup
          divider
          defaultOpen
          primary="Topics"
          items={[
            "/map",
            "/semantic_map",
            "/drivable_area",
            "/RADAR_FRONT",
            "/RADAR_FRONT_LEFT",
            "/RADAR_FRONT_RIGHT",
            "/RADAR_BACK_LEFT",
            "/RADAR_BACK_RIGHT",
            "/LIDAR_TOP",
            "/pose",
            "/markers",
            "/annotations",
          ].map((key) =>
            key === "/semantic_map"
              ? {
                  key,
                  primary: key,
                  defaultOpen: true,
                  items: [
                    {
                      key: "/semantic_map/centerline",
                      primary: "centerline",
                    },
                  ],
                }
              : {
                  key,
                  primary: key,
                },
          )}
        />
      </List>
    </Stack>
  );
}
