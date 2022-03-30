// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import ArrowDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import LayerIcon from "@mui/icons-material/Layers";
import {
  Box,
  Collapse,
  ListItem,
  ListItemButton,
  ListItemButtonProps,
  ListItemIcon,
  ListItemProps,
  ListItemText,
  ListItemTextProps,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  styled as muiStyled,
} from "@mui/material";
import { Fragment, useState } from "react";
import { ReactNode } from "react-markdown/lib/ast-to-react";

import { ColorPickerInput } from "@foxglove/studio-base/components/LayerList/ColorPickerInput";
import Stack from "@foxglove/studio-base/components/Stack";

import { ColorScalePicker } from "./ColorScalePicker";
import { NumberInput } from "./NumberInput";

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

const StyledToggleButtonGroup = muiStyled(ToggleButtonGroup)(({ theme }) => ({
  background: theme.palette.grey[300],
  padding: theme.spacing(0.5),
  border: `1px solid ${theme.palette.divider}`,
  gap: theme.spacing(0.5),
}));

const StyledToggleButton = muiStyled(ToggleButton)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  padding: 0,
  border: "none",

  "&.Mui-selected": {
    background: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
  },
}));

const LayerOptions = muiStyled("div")(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "1fr minmax(128px, 40%)",
  gridAutoRows: 30,
  padding: theme.spacing(0.5, 2, 1, 6.5),
  columnGap: theme.spacing(1.5),
  rowGap: theme.spacing(0.25),
  alignItems: "center",
}));

export function Layer(props: LayerProps): JSX.Element {
  const {
    primary,
    icon,
    defaultOpen = false,
    disableIcon = false,
    onClick,
    options = [],
    ...rest
  } = props;
  const [open, setOpen] = useState<boolean>(defaultOpen);

  return (
    <>
      <StyledListItem {...rest} disablePadding>
        <ListItemButton
          onClick={(event) => {
            options.length > 0 ? setOpen(!open) : onClick(event);
          }}
        >
          <ListItemIcon>
            <Stack direction="row" sx={{ marginLeft: options.length > 0 && -2.5 }}>
              {options.length > 0 && <>{open ? <ArrowDownIcon /> : <ArrowRightIcon />}</>}
              {(!disableIcon && icon) ?? <LayerIcon />}
            </Stack>
          </ListItemIcon>
          <ListItemText
            primary={primary}
            primaryTypographyProps={{ noWrap: true, variant: "subtitle2" }}
          />
        </ListItemButton>
      </StyledListItem>
      {options.length > 0 && (
        <Collapse in={open}>
          <LayerOptions>
            {options.map((option, idx) => (
              <Fragment key={`${idx}.${option.type}.${option.label}`}>
                <Typography variant="subtitle2" color="text.secondary" noWrap title={option.label}>
                  {option.label}
                </Typography>
                <div>
                  {option.type === "number" && (
                    <NumberInput
                      size="small"
                      variant="filled"
                      defaultValue={option.defaultValue}
                      placeholder={option.placeholder}
                      fullWidth
                    />
                  )}
                  {option.type === "enum" &&
                    (option.values != undefined ? (
                      <StyledToggleButtonGroup fullWidth value={option.defaultValue} size="small">
                        {option.values.map((value) => (
                          <StyledToggleButton key={value} value={value}>
                            {value}
                          </StyledToggleButton>
                        ))}
                      </StyledToggleButtonGroup>
                    ) : (
                      <>No options</>
                    ))}
                  {option.type === "boolean" && <>TODO: Boolean</>}
                  {option.type === "gradient" && <ColorScalePicker color="inherit" size="small" />}
                  {option.type === "color" && (
                    <ColorPickerInput
                      defaultValue={option.defaultValue?.toString()}
                      size="small"
                      variant="filled"
                      fullWidth
                    />
                  )}
                </div>
              </Fragment>
            ))}
          </LayerOptions>
        </Collapse>
      )}
    </>
  );
}

type LayerOption = {
  type: "number" | "enum" | "boolean" | "color" | "gradient";
  defaultValue?: number | string | boolean;
  placeholder?: string;
  label: string;
  help?: ReactNode;
  values?: string[];
};

export type LayerProps = {
  primary: ListItemTextProps["primary"];
  icon?: JSX.Element;
  defaultOpen?: boolean;
  onClick?: ListItemButtonProps["onClick"];
  secondaryAction?: ListItemProps["secondaryAction"];
  divider?: ListItemProps["divider"];
  disableIcon?: boolean;
  options?: LayerOption[];
};
