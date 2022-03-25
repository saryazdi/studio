// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import ArrowDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import {
  Collapse,
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

export type Item = {
  key: string;
  onClick?: ListItemButtonProps["onClick"];
  primary?: ListItemTextProps["primary"];
  primaryTypographyProps?: ListItemTextProps["primaryTypographyProps"];
  secondary?: ListItemTextProps["secondary"];
  secondaryTypographyProps?: ListItemTextProps["secondaryTypographyProps"];
};

export type NestedListItemProps = {
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
    minWidth: theme.spacing(6),
    marginLeft: theme.spacing(-1.5),
    opacity: 0.3,
  },
  ".MuiListItemText-inset": {
    paddingLeft: theme.spacing(4.5),
  },
  "&:hover": {
    outline: `1px solid ${theme.palette.primary.main}`,
    outlineOffset: -1,

    ".MuiListItemIcon-root": {
      opacity: 0.8,
    },
  },
}));

export function LayerGroup(props: NestedListItemProps): JSX.Element {
  const {
    defaultOpen = false,
    icon = <FolderIcon />,
    openIcon = <FolderOpenIcon />,
    primary,
    primaryTypographyProps,
    secondary,
    secondaryTypographyProps,
    divider,
    items = [],
  } = props;
  const [open, setOpen] = useState<boolean>(defaultOpen);
  const textProps = { primary, primaryTypographyProps, secondary, secondaryTypographyProps };
  return (
    <>
      <StyledListItem divider={divider} disablePadding {...props}>
        <ListItemButton onClick={() => setOpen(!open)}>
          <ListItemIcon>
            <Stack direction="row">
              {open ? <ArrowDownIcon /> : <ArrowRightIcon />}
              {open ? openIcon : icon}
            </Stack>
          </ListItemIcon>
          <ListItemText {...textProps} />
        </ListItemButton>
      </StyledListItem>
      {items.length > 0 && (
        <Collapse in={open} timeout="auto">
          {items.map(({ ...item }) => (
            <StyledListItem disablePadding key={item.key}>
              <ListItemButton onClick={item.onClick}>
                <ListItemText inset primary={item.primary} secondary={item.secondary} />
              </ListItemButton>
            </StyledListItem>
          ))}
        </Collapse>
      )}
    </>
  );
}
