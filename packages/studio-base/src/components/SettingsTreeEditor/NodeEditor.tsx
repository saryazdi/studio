// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import ArrowDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import ErrorIcon from "@mui/icons-material/Error";
import LayerIcon from "@mui/icons-material/Layers";
import SettingsIcon from "@mui/icons-material/Settings";
import { Divider, ListItemProps, styled as muiStyled, Tooltip, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { DeepReadonly } from "ts-essentials";

import { FieldEditor } from "./FieldEditor";
import { VisibilityToggle } from "./VisibilityToggle";
import { SettingsTreeAction, SettingsTreeNode } from "./types";

export type NodeEditorProps = {
  actionHandler: (action: SettingsTreeAction) => void;
  defaultOpen?: boolean;
  disableIcon?: boolean;
  divider?: ListItemProps["divider"];
  group?: string;
  icon?: JSX.Element;
  path: readonly string[];
  settings?: DeepReadonly<SettingsTreeNode>;
  updateSettings?: (path: readonly string[], value: unknown) => void;
};

const FieldsBottomPad = muiStyled("div", { skipSx: true })(({ theme }) => ({
  gridColumn: "span 2",
  height: theme.spacing(0.5),
}));

const NodeHeader = muiStyled("div")<{
  indent: number;
}>(({ theme, indent }) => {
  return {
    alignItems: "center",
    display: "flex",
    "&:hover": {
      outline: `1px solid ${theme.palette.primary.main}`,
      outlineOffset: -1,
    },
    gridColumn: "span 2",
    paddingBottom: indent === 1 ? theme.spacing(0.5) : 0,
    paddingTop: indent === 1 ? theme.spacing(0.5) : 0,
    paddingRight: theme.spacing(2.25),
  };
});

const NodeHeaderToggle = muiStyled("div")<{ indent: number }>(({ theme, indent }) => {
  return {
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    paddingLeft: theme.spacing(1.25 + 2 * Math.max(0, indent - 1)),
    userSelect: "none",
    width: "100%",
  };
});

function NodeEditorComponent(props: NodeEditorProps): JSX.Element {
  const { actionHandler, defaultOpen = true, disableIcon = false, icon, settings = {} } = props;
  const [open, setOpen] = useState(defaultOpen);

  const indent = props.path.length;
  const allowVisibilityToggle = props.settings?.visible != undefined;
  const visible = props.settings?.visible !== false;

  const toggleVisibility = () => {
    actionHandler({
      action: "update",
      payload: { input: "boolean", path: [...props.path, "visible"], value: !visible },
    });
  };

  const { fields, children } = settings;
  const hasProperties = fields != undefined || children != undefined;

  // Provide stable subpaths so that memoization works.
  const stablePaths = useMemo<Record<string, readonly string[]>>(
    () => ({ "": props.path }),
    [props.path],
  );

  const fieldEditors = Object.entries(fields ?? {}).map(([key, field]) => {
    const stablePath = (stablePaths[key] ??= [...props.path, key]);
    return <FieldEditor key={key} field={field} path={stablePath} actionHandler={actionHandler} />;
  });

  const childNodes = Object.entries(children ?? {}).map(([key, child]) => {
    const stablePath = (stablePaths[key] ??= [...props.path, key]);
    return (
      <NodeEditor
        actionHandler={actionHandler}
        defaultOpen={child.defaultExpansionState === "collapsed" ? false : true}
        disableIcon={true}
        key={key}
        settings={child}
        path={stablePath}
      />
    );
  });

  return (
    <>
      {indent > 0 && (
        <NodeHeader indent={indent}>
          <NodeHeaderToggle indent={indent} onClick={() => setOpen(!open)}>
            <div
              style={{
                display: "inline-flex",
                opacity: visible ? 0.6 : 0.3,
                marginRight: "0.25rem",
              }}
            >
              {hasProperties && <>{open ? <ArrowDownIcon /> : <ArrowRightIcon />}</>}
              {!disableIcon &&
                (icon != undefined ? icon : indent > 0 ? <LayerIcon /> : <SettingsIcon />)}
            </div>
            <Typography
              noWrap={true}
              variant="subtitle2"
              color={visible ? "text.primary" : "text.disabled"}
            >
              {settings.label ?? "Settings"}
            </Typography>
          </NodeHeaderToggle>
          {props.settings?.error && (
            <Tooltip
              arrow
              title={<Typography variant="subtitle1">{props.settings.error}</Typography>}
            >
              <ErrorIcon color="error" fontSize="small" />
            </Tooltip>
          )}
          <VisibilityToggle
            edge="end"
            size="small"
            checked={visible}
            onChange={toggleVisibility}
            style={{ opacity: allowVisibilityToggle ? 1 : 0 }}
            disabled={!allowVisibilityToggle}
          />
        </NodeHeader>
      )}
      {open && fieldEditors.length > 0 && (
        <>
          {fieldEditors}
          <FieldsBottomPad />
        </>
      )}
      {open && childNodes}
      {indent === 1 && <Divider style={{ gridColumn: "span 2" }} />}
    </>
  );
}

export const NodeEditor = React.memo(NodeEditorComponent);
