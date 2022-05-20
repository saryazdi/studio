// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import icons from "./icons";

export type SettingsTreeFieldValue =
  | { input: "autocomplete"; value?: string; items: ReadonlyArray<string> }
  | { input: "boolean"; value?: boolean }
  | { input: "rgb"; value?: string }
  | { input: "rgba"; value?: string }
  | { input: "gradient"; value?: [string, string] }
  | { input: "messagepath"; value?: string; validTypes?: string[] }
  | {
      input: "number";
      value?: number;
      step?: number;
      max?: number;
      min?: number;
      precision?: number;
    }
  | {
      input: "select";
      value?: number | ReadonlyArray<number>;
      options: ReadonlyArray<{ label: string; value: undefined | number }>;
    }
  | {
      input: "select";
      value?: string | ReadonlyArray<string>;
      options: ReadonlyArray<{ label: string; value: undefined | string }>;
    }
  | { input: "string"; value?: string }
  | { input: "toggle"; value?: string; options: ReadonlyArray<string> }
  | {
      input: "vec3";
      value?: readonly [undefined | number, undefined | number, undefined | number];
      step?: number;
      precision?: number;
      labels?: [string, string, string];
    };

export type SettingsTreeField = SettingsTreeFieldValue & {
  /**
   * Optional help text to explain the purpose of the field.
   */
  help?: string;

  /**
   * The label displayed alongside the field.
   */
  label: string;

  /**
   * Optional placeholder text displayed in the field input in the
   * absence of a value.
   */
  placeholder?: string;

  /**
   * Optional message indicating any error state for the field.
   */
  error?: string;
};

export type SettingsTreeFields = Record<string, SettingsTreeField>;

export type SettingsTreeChildren = Record<string, SettingsTreeNode>;

/**
 * An action that can be offered to the user to perform at the
 * level of a settings node.
 */
export type SettingsTreeNodeAction = {
  /**
   * A unique idenfier for the action.
   */
  id: string;

  /**
   * A descriptive label for the action.
   */
  label: string;

  /**
   * Optional icon to display with the action.
   */
  icon?: keyof typeof icons;
};

export type SettingsTreeNode = {
  /**
   * An array of actions that can be performeed on this node.
   */
  actions?: SettingsTreeNodeAction[];

  /**
   * Other settings tree nodes nested under this node.
   */
  children?: SettingsTreeChildren;

  /**
   * Set to collapsed if the node should be initially collapsed.
   */
  defaultExpansionState?: "collapsed" | "expanded";

  /**
   * Field inputs attached directly to this node.
   */
  fields?: SettingsTreeFields;

  /**
   * Optional icon to display next to the node label.
   */
  icon?: keyof typeof icons;

  /**
   * An optional label shown at the top of this node.
   */
  label?: string;

  /**
   * An optional visibility status. If this is not undefined, the node
   * editor will display a visiblity toggle button and send update actions
   * to the action handler.
   **/
  visible?: boolean;
};

/**
 * Distributes Pick<T, K> across all members of a union, used for extracting structured
 * subtypes.
 */
type DistributivePick<T, K extends keyof T> = T extends unknown ? Pick<T, K> : never;

/**
 * Represents actions that can be dispatched to source of the SettingsTree to implement
 * edits and updates.
 */
export type SettingsTreeAction =
  | {
      action: "update";
      payload: { path: ReadonlyArray<string> } & DistributivePick<
        SettingsTreeFieldValue,
        "input" | "value"
      >;
    }
  | {
      action: "perform-node-action";
      payload: { id: string; path: readonly string[] };
    };

export type SettingsTreeRoots = Record<string, SettingsTreeNode>;

/**
 * A settings tree is a tree of panel settings that can be managed by
 * a default user interface in Studio.
 */
export type SettingsTree = {
  /**
   * Handler to process all actions on the settings tree initiated by the UI.
   */
  actionHandler: (action: SettingsTreeAction) => void;

  /**
   * True if the editor should show the filter control.
   */
  enableFilter?: boolean;

  /**
   * The actual settings tree roots. Updates to these will automatically be reflected in the
   * editor UI.
   */
  roots: SettingsTreeRoots;
};
