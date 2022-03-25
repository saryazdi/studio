// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import LayerIcon from "@mui/icons-material/Layers";
import {
  ListItem,
  ListItemButton,
  ListItemButtonProps,
  ListItemIcon,
  ListItemProps,
  ListItemText,
  ListItemTextProps,
  styled as muiStyled,
} from "@mui/material";

const StyledListItem = muiStyled(ListItem)(({ theme }) => ({
  ".MuiListItemIcon-root": {
    minWidth: theme.spacing(4.5),
    paddingLeft: theme.spacing(1),
    opacity: 0.3,
  },
  "&:hover": {
    outline: `1px solid ${theme.palette.primary.main}`,
    outlineOffset: -1,

    ".MuiListItemIcon-root": {
      opacity: 0.8,
    },
  },
}));

export function Layer(props: LayerProps): JSX.Element {
  const { primary, icon, onClick, disableIcon = false, ...rest } = props;
  return (
    <StyledListItem {...rest} disablePadding>
      <ListItemButton onClick={onClick}>
        <ListItemIcon>{(!disableIcon && icon) ?? <LayerIcon />}</ListItemIcon>
        <ListItemText primary={primary} primaryTypographyProps={{ noWrap: true }} />
      </ListItemButton>
    </StyledListItem>
  );
}

type LayerProps = {
  primary: ListItemTextProps["primary"];
  icon?: JSX.Element;
  onClick?: ListItemButtonProps["onClick"];
  secondaryAction?: ListItemProps["secondaryAction"];
  divider?: ListItemProps["divider"];
  disableIcon?: boolean;
};
