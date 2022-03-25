// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import ArrowDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import {
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemButtonProps,
  ListItemIcon,
  ListItemProps,
  ListItemText,
  ListItemTextProps,
  styled as muiStyled,
} from "@mui/material";
import { useState } from "react";

import Stack from "@foxglove/studio-base/components/Stack";

import { Layer } from "./Layer";

export type Item = {
  key: string;
  onClick?: ListItemButtonProps["onClick"];
  primary?: ListItemTextProps["primary"];
  primaryTypographyProps?: ListItemTextProps["primaryTypographyProps"];
  secondary?: ListItemTextProps["secondary"];
  secondaryTypographyProps?: ListItemTextProps["secondaryTypographyProps"];
  items?: Item[];
};

export type LayerGroupProps = {
  defaultOpen?: boolean;
  divider?: ListItemProps["divider"];
  icon?: JSX.Element;
  openIcon?: JSX.Element;
  primary?: ListItemTextProps["primary"];
  primaryTypographyProps?: ListItemTextProps["primaryTypographyProps"];
  secondary?: ListItemTextProps["secondary"];
  secondaryTypographyProps?: ListItemTextProps["secondaryTypographyProps"];
  items?: Item[];
};

const StyledListItem = muiStyled(ListItem)(({ theme }) => ({
  ".MuiListItemIcon-root": {
    minWidth: theme.spacing(3.5),
    opacity: 0.3,
  },
  ".MuiListItemButton-root": {
    paddingLeft: theme.spacing(3),
  },
  ".MuiListItemText-inset": {
    paddingLeft: theme.spacing(6),
  },
  "&:hover": {
    outline: `1px solid ${theme.palette.primary.main}`,
    outlineOffset: -1,

    ".MuiListItemIcon-root": {
      opacity: 0.8,
    },
  },
}));

export function LayerSubGroup(props: Omit<LayerGroupProps, "icon" | "openIcon">): JSX.Element {
  const {
    defaultOpen = false,
    primary,
    primaryTypographyProps,
    secondary,
    secondaryTypographyProps,
    items = [],
  } = props;
  const [open, setOpen] = useState<boolean>(defaultOpen);
  const textProps = { primary, primaryTypographyProps, secondary, secondaryTypographyProps };

  return (
    <>
      <StyledListItem disablePadding>
        <ListItemButton onClick={() => setOpen(!open)}>
          <ListItemIcon>{open ? <ArrowDownIcon /> : <ArrowRightIcon />}</ListItemIcon>
          <ListItemText {...textProps} />
        </ListItemButton>
      </StyledListItem>
      {items.length > 0 && (
        <Collapse in={open} timeout="auto">
          <List dense disablePadding>
            {items.map(({ ...item }) => (
              <StyledListItem disablePadding key={item.key}>
                <ListItemButton onClick={item.onClick}>
                  <ListItemText inset primary={item.primary} secondary={item.secondary} />
                </ListItemButton>
              </StyledListItem>
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
}

export function LayerGroup(props: LayerGroupProps): JSX.Element {
  const {
    defaultOpen = false,
    icon = <FolderIcon />,
    openIcon = <FolderOpenIcon />,
    primary,
    primaryTypographyProps,
    secondary,
    secondaryTypographyProps,
    items = [],
  } = props;
  const [open, setOpen] = useState<boolean>(defaultOpen);
  const textProps = { primary, primaryTypographyProps, secondary, secondaryTypographyProps };
  return (
    <>
      <Layer
        onClick={() => setOpen(!open)}
        divider
        icon={
          <Stack direction="row" style={{ marginLeft: "-20px" }}>
            {open ? <ArrowDownIcon /> : <ArrowRightIcon />}
            {open ? openIcon : icon}
          </Stack>
        }
        {...textProps}
      />
      {items.length > 0 && (
        <Collapse in={open} timeout="auto">
          <List dense disablePadding>
            {items.map(({ ...item }) => (
              <>
                {item.items ? (
                  <LayerSubGroup
                    key={item.key}
                    primary={item.primary}
                    secondary={item.secondary}
                    items={item.items}
                  />
                ) : (
                  <Layer disableIcon onClick={item.onClick} key={item.key} primary={item.primary} />
                )}
              </>
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
}
