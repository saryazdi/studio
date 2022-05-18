// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import AddIcon from "@mui/icons-material/Add";
import ArrowDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import ClearIcon from "@mui/icons-material/Clear";
import GridIcon from "@mui/icons-material/GridOn";
import SearchIcon from "@mui/icons-material/Search";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import {
  AppBar,
  Divider,
  IconButton,
  InputBase,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  styled as muiStyled,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { DeepReadonly } from "ts-essentials";

import { VisibilityToggle } from "@foxglove/studio-base/components/SettingsTreeEditor/VisibilityToggle";
import Stack from "@foxglove/studio-base/components/Stack";

import { NodeEditor, NodeHeader, NodeHeaderToggle } from "./NodeEditor";
import { SettingsTree } from "./types";

const StyledAppBar = muiStyled(AppBar, { skipSx: true })(({ theme }) => ({
  top: -1,
  zIndex: theme.zIndex.appBar - 1,
  borderBottom: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(1),
}));

const FieldGrid = muiStyled("div", { skipSx: true })(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "minmax(4rem, 1fr) minmax(4rem, 12rem)",
  columnGap: theme.spacing(1),
  rowGap: theme.spacing(0.25),
}));

const ROOT_PATH: readonly string[] = [];

function CustomLayers() {
  const [open, setOpen] = useState<boolean>(true);
  const [layers, setLayers] = useState<{ key: string }[]>([
    { key: "Text layer 1" },
    { key: "Grid layer 1" },
  ]);
  const [anchorEl, setAnchorEl] = useState<undefined | HTMLElement>(undefined);
  const menuOpen = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(undefined);
  };

  return (
    <>
      <NodeHeader indent={1}>
        <NodeHeaderToggle indent={1} onClick={() => setOpen(!open)}>
          <div
            style={{
              display: "inline-flex",
              opacity: 0.6,
              marginRight: "0.25rem",
            }}
          >
            {open ? <ArrowDownIcon /> : <ArrowRightIcon />}
          </div>
          <Typography noWrap variant="subtitle2" color="text.primary">
            Layers
          </Typography>
        </NodeHeaderToggle>
        <IconButton
          id="basic-button"
          size="small"
          aria-controls={menuOpen ? "basic-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={menuOpen ? "true" : undefined}
          onClick={handleClick}
        >
          <AddIcon fontSize="small" />
        </IconButton>
        <VisibilityToggle edge="end" size="small" checked />
      </NodeHeader>
      {open && (
        <>
          {layers.map((layer) => (
            <NodeHeader key={layer.key} indent={2}>
              <NodeHeaderToggle indent={2}>
                <div
                  style={{
                    display: "inline-flex",
                    opacity: 0.6,
                    marginRight: "0.25rem",
                  }}
                >
                  <ArrowDownIcon />
                </div>
                <Typography noWrap variant="subtitle2" color="text.primary">
                  <InputBase
                    style={{ fontSize: "inherit", color: "inherit" }}
                    defaultValue={layer.key}
                  />
                </Typography>
              </NodeHeaderToggle>
              <VisibilityToggle edge="end" size="small" checked />
            </NodeHeader>
          ))}
          <Menu
            id="basic-menu"
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={handleClose}
            MenuListProps={{
              "aria-labelledby": "basic-button",
            }}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
          >
            <ListSubheader>Add layer</ListSubheader>
            <MenuItem
              onClick={() => {
                setLayers([{ key: `Text layer ${layers.length + 1}` }, ...layers]);
                handleClose();
              }}
            >
              <ListItemIcon>
                <TextFieldsIcon />
              </ListItemIcon>
              <ListItemText primary="Text label" />
            </MenuItem>
            <MenuItem
              onClick={() => {
                setLayers([{ key: `Grid layer ${layers.length + 1}` }, ...layers]);
                handleClose();
              }}
            >
              <ListItemIcon>
                <GridIcon />
              </ListItemIcon>
              <ListItemText>Grid</ListItemText>
            </MenuItem>
          </Menu>
        </>
      )}
    </>
  );
}

export default function SettingsTreeEditor({
  settings,
}: {
  settings: DeepReadonly<SettingsTree>;
}): JSX.Element {
  const { actionHandler } = settings;
  const [filterText, setFilterText] = useState<string>("");

  return (
    <Stack fullHeight>
      {settings.enableFilter === true && (
        <StyledAppBar position="sticky" color="default" elevation={0}>
          <TextField
            onChange={(event) => setFilterText(event.target.value)}
            value={filterText}
            variant="filled"
            fullWidth
            placeholder="Filter"
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
      )}
      <FieldGrid>
        <Divider style={{ gridColumn: "span 2" }} />
        <CustomLayers />
        <Divider style={{ gridColumn: "span 2" }} />
        <NodeEditor path={ROOT_PATH} settings={settings.settings} actionHandler={actionHandler} />
      </FieldGrid>
    </Stack>
  );
}
