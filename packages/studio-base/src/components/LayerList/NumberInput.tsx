// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { IconButton, TextFieldProps, TextField, styled as muiStyled } from "@mui/material";

import { fonts } from "@foxglove/studio-base/util/sharedStyleConstants";

const StyledTextField = muiStyled(TextField)({
  ".MuiInputBase-formControl.MuiInputBase-root": {
    padding: 0,
  },
  ".MuiInputBase-input": {
    textAlign: "center",
    fontFamily: fonts.MONOSPACE,

    "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button": {
      appearance: "none",
      margin: 0,
    },
  },
});

const StyledIconButton = muiStyled(IconButton)({
  "&.MuiIconButton-edgeStart": {
    margin: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  "&.MuiIconButton-edgeEnd": {
    margin: 0,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
});

export function NumberInput(props: TextFieldProps): JSX.Element {
  return (
    <StyledTextField
      {...props}
      type="number"
      InputProps={{
        startAdornment: (
          <StyledIconButton size="small" edge="start">
            <ChevronLeftIcon fontSize="small" />
          </StyledIconButton>
        ),
        endAdornment: (
          <StyledIconButton size="small" edge="end">
            <ChevronRightIcon fontSize="small" />
          </StyledIconButton>
        ),
      }}
    />
  );
}
