// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import ArrowDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import LayerIcon from "@mui/icons-material/Layers";
import {
  Collapse,
  Checkbox,
  CheckboxProps,
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
  MenuItem,
  SvgIcon,
  Select,
  TextField,
} from "@mui/material";
import { ChangeEvent, Fragment, useState } from "react";
import { ReactNode } from "react-markdown/lib/ast-to-react";

import { ColorPickerInput } from "@foxglove/studio-base/components/LayerList/ColorPickerInput";
import Stack from "@foxglove/studio-base/components/Stack";

import { ColorScalePicker } from "./ColorScalePicker";
import { NumberInput } from "./NumberInput";

const StyledListItem = muiStyled(ListItem)<{ visible: boolean }>(({ theme, visible }) => ({
  ".MuiListItemIcon-root": {
    minWidth: theme.spacing(4.5),
    paddingLeft: theme.spacing(1),
    opacity: visible ? 0.6 : 0.3,
  },
  "&:hover": {
    outline: `1px solid ${theme.palette.primary.main}`,
    outlineOffset: -1,

    ".MuiListItemIcon-root": {
      opacity: visible ? 1 : 0.8,
    },
  },
  ...(visible && {
    "@media (pointer: fine)": {
      ".MuiListItemSecondaryAction-root": {
        visibility: "hidden",
      },
      "&:hover": {
        ".MuiListItemSecondaryAction-root": {
          visibility: "visible",
        },
      },
    },
  }),
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

const LayerOptions = muiStyled("div")<{ visible: boolean }>(({ theme, visible }) => ({
  display: "grid",
  gridTemplateColumns: "1fr minmax(192px, 40%)",
  gridAutoRows: 30,
  padding: theme.spacing(0.5, 1.5, 1, 6.5),
  columnGap: theme.spacing(1.5),
  rowGap: theme.spacing(0.25),
  alignItems: "center",
  opacity: visible ? 1 : 0.6,
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

export function LayerOption({
  label,
  variant,
  defaultValue,
  placeholder,
  options,
}: LayerProperty): JSX.Element {
  const control = () => {
    switch (variant) {
      case "number":
        return (
          <NumberInput
            size="small"
            variant="filled"
            defaultValue={defaultValue}
            placeholder={placeholder}
            fullWidth
          />
        );
      case "string":
        return <TextField variant="filled" defaultValue={defaultValue} size="small" fullWidth />;
      case "select":
        return options != undefined ? (
          <Select size="small" fullWidth variant="filled" defaultValue={defaultValue}>
            {options.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </Select>
        ) : (
          <>No options</>
        );
      case "color":
        return (
          <ColorPickerInput
            defaultValue={defaultValue?.toString()}
            size="small"
            variant="filled"
            fullWidth
          />
        );
      case "toggle":
        return options != undefined ? (
          <StyledToggleButtonGroup fullWidth value={defaultValue} size="small">
            {options.map((opt) => (
              <StyledToggleButton key={opt} value={opt}>
                {opt}
              </StyledToggleButton>
            ))}
          </StyledToggleButtonGroup>
        ) : (
          <>No options</>
        );
      case "gradient":
        return <ColorScalePicker color="inherit" size="small" />;
      case "messagePath":
        return <>{/* TODO: Message path input */}</>;
      case "boolean":
        return <>{/* TODO: Boolean */}</>;
      default:
        return <></>;
    }
  };

  return (
    <>
      <Typography variant="subtitle2" color="text.secondary" noWrap title={label}>
        {label}
      </Typography>
      {control()}
    </>
  );
}

export function Layer(props: LayerProps): JSX.Element {
  const {
    primary,
    icon,
    defaultOpen = false,
    disableIcon = false,
    onClick = () => {},
    properties = [],
    secondaryAction,
    ...rest
  } = props;
  const [open, setOpen] = useState<boolean>(defaultOpen);
  const [visible, setVisiblity] = useState<boolean>(true);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setVisiblity(event.target.checked);
  };

  return (
    <>
      <StyledListItem
        {...rest}
        visible={visible}
        secondaryAction={
          <Stack direction="row" gap={0.5} alignItems="center">
            {secondaryAction}
            <VisibilityToggleIcon
              edge="end"
              size="small"
              checked={visible}
              onChange={handleChange}
            />
          </Stack>
        }
        disablePadding
      >
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
            primaryTypographyProps={{
              noWrap: true,
              variant: "subtitle2",
              color: visible ? "text.primary" : "text.disabled",
            }}
          />
        </ListItemButton>
      </StyledListItem>
      {properties.length > 0 && (
        <Collapse in={open}>
          <LayerOptions visible={visible}>
            {properties.map((prop, idx) => (
              <LayerOption key={`${idx}.${prop.variant}.${prop.label}`} {...prop} />
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
