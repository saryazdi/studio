// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import ArrowDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
// import DataObjectIcon from "@mui/icons-material/DataObject";
import LayerIcon from "@mui/icons-material/Layers";
import {
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
  // IconButton,
  MenuItem,
  Select,
  TextField,
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
  background: theme.palette.grey[200],
  padding: theme.spacing(0.25),
  border: `1px solid ${theme.palette.divider} !important`,
  gap: theme.spacing(0.25),

  ".MuiToggleButton-root": {
    borderRadius: `${theme.shape.borderRadius} !important`,

    "&.Mui-selected": {
      border: `1px solid ${theme.palette.divider} !important`,
    },
  },
}));

const StyledToggleButton = muiStyled(ToggleButton)(({ theme }) => ({
  borderRadius: `${theme.shape.borderRadius} !important`,
  padding: 0,
  border: "none",

  "&.Mui-selected": {
    background: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
  },
}));

const LayerOptions = muiStyled("div")(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "1fr minmax(192px, 40%)",
  gridAutoRows: 30,
  padding: theme.spacing(0.5, 1.5, 1, 6.5),
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
    onClick = () => {},
    properties = [],
    ...rest
  } = props;
  const [open, setOpen] = useState<boolean>(defaultOpen);

  return (
    <>
      <StyledListItem {...rest} disablePadding>
        <ListItemButton
          onClick={(event) => {
            if (properties.length > 0) {
              setOpen(!open);
            } else {
              onClick(event);
            }
          }}
        >
          <ListItemIcon>
            <Stack direction="row" sx={{ marginLeft: properties.length > 0 && -2.5 }}>
              {properties.length > 0 && <>{open ? <ArrowDownIcon /> : <ArrowRightIcon />}</>}
              {(!disableIcon && icon) ?? <LayerIcon />}
            </Stack>
          </ListItemIcon>
          <ListItemText
            primary={primary}
            primaryTypographyProps={{ noWrap: true, variant: "subtitle2" }}
          />
        </ListItemButton>
      </StyledListItem>
      {properties.length > 0 && (
        <Collapse in={open}>
          <LayerOptions>
            {properties.map((prop, idx) => (
              <Fragment key={`${idx}.${prop.variant}.${prop.label}`}>
                <Typography variant="subtitle2" color="text.secondary" noWrap title={prop.label}>
                  {prop.label}
                </Typography>
                {/* <IconButton edge="end" size="small">
                  <DataObjectIcon fontSize="small" />
                </IconButton> */}
                <div>
                  {prop.variant === "number" && (
                    <NumberInput
                      size="small"
                      variant="filled"
                      defaultValue={prop.defaultValue}
                      placeholder={prop.placeholder}
                      fullWidth
                    />
                  )}
                  {prop.variant === "toggle" &&
                    (prop.options != undefined ? (
                      <StyledToggleButtonGroup fullWidth value={prop.defaultValue} size="small">
                        {prop.options.map((opt) => (
                          <StyledToggleButton key={opt} value={opt}>
                            {opt}
                          </StyledToggleButton>
                        ))}
                      </StyledToggleButtonGroup>
                    ) : (
                      <>No options</>
                    ))}
                  {prop.variant === "select" &&
                    (prop.options != undefined ? (
                      <Select
                        size="small"
                        fullWidth
                        variant="filled"
                        defaultValue={prop.defaultValue}
                      >
                        {prop.options.map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                      </Select>
                    ) : (
                      <>No options</>
                    ))}
                  {prop.variant === "messagePath" && <>Message path input</>}
                  {prop.variant === "string" && (
                    <TextField
                      variant="filled"
                      defaultValue={prop.defaultValue}
                      size="small"
                      fullWidth
                    />
                  )}
                  {prop.variant === "boolean" && <>TODO: Boolean</>}
                  {prop.variant === "gradient" && <ColorScalePicker color="inherit" size="small" />}
                  {prop.variant === "color" && (
                    <ColorPickerInput
                      defaultValue={prop.defaultValue?.toString()}
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

type LayerProperty = {
  variant:
    | "number"
    | "toggle"
    | "select"
    | "string"
    | "boolean"
    | "color"
    | "gradient"
    | "messagePath";
  defaultValue?: number | string | boolean;
  placeholder?: string;
  label: string;
  help?: ReactNode;
  options?: string[];
};

export type LayerProps = {
  primary: ListItemTextProps["primary"];
  icon?: JSX.Element;
  defaultOpen?: boolean;
  onClick?: ListItemButtonProps["onClick"];
  secondaryAction?: ListItemProps["secondaryAction"];
  divider?: ListItemProps["divider"];
  disableIcon?: boolean;
  properties?: LayerProperty[];
};
