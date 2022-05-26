// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { makeStyles } from "@fluentui/react";
import BorderAllIcon from "@mdi/svg/svg/border-all.svg";
import ExpandAllOutlineIcon from "@mdi/svg/svg/expand-all-outline.svg";
import GridLargeIcon from "@mdi/svg/svg/grid-large.svg";
import TrashCanOutlineIcon from "@mdi/svg/svg/trash-can-outline.svg";
import { styled as muiStyled } from "@mui/material";
import { last } from "lodash";
import React, {
  useState,
  useCallback,
  useContext,
  useMemo,
  useRef,
  ComponentType,
  Profiler,
  MouseEventHandler,
  useLayoutEffect,
  useEffect,
} from "react";
import {
  MosaicContext,
  MosaicWindowActions,
  MosaicWindowContext,
  getNodeAtPath,
  getOtherBranch,
  updateTree,
  MosaicNode,
} from "react-mosaic-component";
import { Transition } from "react-transition-group";
import { useMountedState } from "react-use";

import { useShallowMemo } from "@foxglove/hooks";
import { useConfigById } from "@foxglove/studio-base/PanelAPI";
import Button from "@foxglove/studio-base/components/Button";
import Icon from "@foxglove/studio-base/components/Icon";
import KeyListener from "@foxglove/studio-base/components/KeyListener";
import PanelContext from "@foxglove/studio-base/components/PanelContext";
import PanelErrorBoundary from "@foxglove/studio-base/components/PanelErrorBoundary";
import {
  FULLSCREEN_TRANSITION_DURATION_MS,
  PanelRoot,
} from "@foxglove/studio-base/components/PanelRoot";
import {
  useCurrentLayoutActions,
  useSelectedPanels,
} from "@foxglove/studio-base/context/CurrentLayoutContext";
import { usePanelCatalog } from "@foxglove/studio-base/context/PanelCatalogContext";
import { useWorkspace } from "@foxglove/studio-base/context/WorkspaceContext";
import usePanelDrag from "@foxglove/studio-base/hooks/usePanelDrag";
import { TabPanelConfig } from "@foxglove/studio-base/types/layouts";
import { PanelConfig, SaveConfig, OpenSiblingPanel } from "@foxglove/studio-base/types/panels";
import { TAB_PANEL_TYPE } from "@foxglove/studio-base/util/globalConstants";
import {
  getPanelIdForType,
  getPanelTypeFromId,
  getPathFromNode,
  updateTabPanelLayout,
} from "@foxglove/studio-base/util/layout";
import { colors } from "@foxglove/studio-base/util/sharedStyleConstants";

const ActionsOverlay = muiStyled("div")`
  cursor: pointer;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100000; // highest level within panel
  display: none;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-end;
  font-size: 14px;
  padding-top: 24px;

  ${PanelRoot.toString()}:hover > & {
    background-color: ${({ theme }) => theme.palette.background.default};
    display: flex;
    align-items: center;
    align-content: center;
    justify-content: center;
    flex-wrap: wrap;
  }
  // for screenshot tests
  .hoverForScreenshot {
    background-color: ${({ theme }) => theme.palette.background.default};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
  }

  div {
    width: 100%;
    padding: 6px 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
  }

  svg {
    margin-right: 4px;
    width: 24px;
    height: 24px;
    fill: white;
  }
  p {
    font-size: 12px;
    color: ${colors.TEXT_MUTED};
  }
`;

const useStyles = makeStyles((theme) => ({
  perfInfo: {
    position: "absolute",
    whiteSpace: "pre-line",
    bottom: 2,
    left: 2,
    fontSize: "9px",
    opacity: 0.7,
    userSelect: "none",
    mixBlendMode: "difference",
  },
  quickActionsOverlayButton: {
    width: 72,
    height: 72,
    margin: 4,
    flex: "none",
    fontSize: "14px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: `${theme.semanticColors.primaryButtonBackground} !important`,
    color: `${theme.semanticColors.primaryButtonText} !important`,

    svg: {
      margin: "0 0 6px",
      fill: theme.semanticColors.primaryButtonText,
    },

    ":not(.disabled):hover": {
      background: `${theme.semanticColors.primaryButtonBackgroundHovered} !important`,
    },
  },
  tabActionsOverlayButton: {
    margin: "4px !important",
    flex: "none",
    fontSize: "14px",
    alignItems: "center",
    background: `${colors.BLUE} !important`,
    color: `${theme.semanticColors.primaryButtonText} !important`,
    width: 145,
    height: 40,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",

    svg: {
      margin: "0 0 6px",
      fill: theme.semanticColors.primaryButtonText,
    },
    ":not(.disabled):hover": {
      background: `${colors.BLUE1} !important`,
    },
  },
}));

type Props<Config> = {
  childId?: string;
  overrideConfig?: Config;
  tabId?: string;
};

export interface PanelStatics<Config> {
  panelType: string;
  defaultConfig: Config;
}

// Like React.ComponentType<P>, but without restrictions on the constructor return type.
type ComponentConstructorType<P> = { displayName?: string } & (
  | { new (props: P): React.Component<unknown, unknown> }
  | { (props: P): React.ReactElement<unknown> | ReactNull }
);

// HOC that wraps panel in an error boundary and flex box.
// Gives panel a `config` and `saveConfig`.
//   export default Panel(MyPanelComponent)
//
// `config` comes from the current layout, but in stories / tests you can pass in your own:
//   `<MyPanel config={…} />`
export default function Panel<
  Config extends PanelConfig,
  PanelProps extends { config: Config; saveConfig: SaveConfig<Config> },
>(
  PanelComponent: ComponentConstructorType<PanelProps> & PanelStatics<Config>,
): ComponentType<Props<Config> & Omit<PanelProps, "config" | "saveConfig">> & PanelStatics<Config> {
  function ConnectedPanel(props: Props<Config>) {
    const { childId, overrideConfig, tabId, ...otherProps } = props;

    const classes = useStyles();
    const isMounted = useMountedState();

    const { mosaicActions } = useContext(MosaicContext);
    const { mosaicWindowActions }: { mosaicWindowActions: MosaicWindowActions } =
      useContext(MosaicWindowContext);

    const {
      selectedPanelIds,
      setSelectedPanelIds,
      selectAllPanels,
      togglePanelSelected,
      getSelectedPanelIds,
    } = useSelectedPanels();

    const isSelected = useMemo(
      () => childId != undefined && selectedPanelIds.includes(childId),
      [childId, selectedPanelIds],
    );
    const numSelectedPanelsIfSelected = useMemo(
      () => (isSelected ? selectedPanelIds.length : 0),
      [isSelected, selectedPanelIds],
    );

    const {
      savePanelConfigs,
      updatePanelConfigs,
      createTabPanel,
      closePanel,
      getCurrentLayoutState,
    } = useCurrentLayoutActions();

    const [quickActionsKeyPressed, setQuickActionsKeyPressed] = useState(false);
    const [shiftKeyPressed, setShiftKeyPressed] = useState(false);
    const [cmdKeyPressed, setCmdKeyPressed] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [fullscreenSourceRect, setFullscreenSourceRect] = useState<DOMRect | undefined>(
      undefined,
    );
    const [hasFullscreenDescendant, _setHasFullscreenDescendant] = useState(false);
    const panelRootRef = useRef<HTMLDivElement>(ReactNull);
    const panelCatalog = usePanelCatalog();
    const isTopLevelPanel = mosaicWindowActions.getPath().length === 0 && tabId == undefined;

    // There may be a parent panel (when a panel is in a tab).
    const parentPanelContext = useContext(PanelContext);

    const type = PanelComponent.panelType;
    const title = useMemo(
      () => panelCatalog.getPanelByType(type)?.title ?? "",
      [panelCatalog, type],
    );

    const defaultConfig = PanelComponent.defaultConfig;
    const [savedConfig, saveConfig] = useConfigById<Config>(childId);

    const resetPanel = useCallback(() => {
      saveConfig(defaultConfig);
    }, [defaultConfig, saveConfig]);

    // PanelSettings needs useConfigById to return a complete config. If there is no saved config
    // (or it is an empty object), or if keys have been added to the default config since it was
    // previously saved, we save the default config provided by the panel. This typically happens
    // when a new panel is added and the layout does not yet have a config. Even if this effect gets
    // run more than once, we only need to save the default config once.
    //
    // An empty object can occur when swapping a panel
    const savedDefaultConfig = useRef(false);
    useLayoutEffect(() => {
      if (savedDefaultConfig.current) {
        return;
      }

      if (!savedConfig || Object.keys(savedConfig).length === 0) {
        savedDefaultConfig.current = true;
        saveConfig(defaultConfig);
      } else if (
        Object.entries(defaultConfig).some(
          ([key, value]) => value != undefined && !(key in savedConfig),
        )
      ) {
        savedDefaultConfig.current = true;
        saveConfig({ ...defaultConfig, ...savedConfig });
      }
    }, [defaultConfig, saveConfig, savedConfig]);

    const panelComponentConfig = useMemo(
      () => ({ ...defaultConfig, ...savedConfig, ...overrideConfig }),
      [savedConfig, defaultConfig, overrideConfig],
    );

    // Open a panel next to the current panel, of the specified `panelType`.
    // If such a panel already exists, we update it with the new props.
    const openSiblingPanel = useCallback<OpenSiblingPanel>(
      async ({ panelType, siblingConfigCreator, updateIfExists }) => {
        const panelsState = getCurrentLayoutState().selectedLayout?.data;
        if (!panelsState) {
          return;
        }

        let siblingDefaultConfig: PanelConfig = {};

        // If we can lookup the sibling panel type, try to load the default config from the panel module
        const siblingPanelInfo = panelCatalog.getPanelByType(panelType);
        if (siblingPanelInfo) {
          const siblingModule = await siblingPanelInfo.module();
          if (!isMounted()) {
            return;
          }

          siblingDefaultConfig = siblingModule.default.defaultConfig;
        }

        const ownPath = mosaicWindowActions.getPath();

        // Try to find a sibling panel and update it with the `siblingConfig`
        if (updateIfExists) {
          const lastNode = last(ownPath);
          const siblingPathEnd = lastNode != undefined ? getOtherBranch(lastNode) : "second";
          const siblingPath = ownPath.slice(0, -1).concat(siblingPathEnd);
          const siblingId = getNodeAtPath(mosaicActions.getRoot(), siblingPath);
          if (typeof siblingId === "string" && getPanelTypeFromId(siblingId) === panelType) {
            const siblingConfig: PanelConfig = {
              ...siblingDefaultConfig,
              ...panelsState.configById[siblingId],
            };
            savePanelConfigs({
              configs: [
                {
                  id: siblingId,
                  config: siblingConfigCreator(siblingConfig),
                  defaultConfig: siblingDefaultConfig,
                },
              ],
            });
            return;
          }
        }

        // Otherwise, open new panel
        const newPanelPath = ownPath.concat("second");
        const newPanelConfig = siblingConfigCreator(siblingDefaultConfig);
        void mosaicWindowActions
          .split({ type: panelType, panelConfig: newPanelConfig })
          .then(() => {
            const newPanelId = getNodeAtPath(mosaicActions.getRoot(), newPanelPath) as string;
            savePanelConfigs({
              configs: [
                {
                  id: newPanelId,
                  config: newPanelConfig,
                  defaultConfig: siblingDefaultConfig,
                },
              ],
            });
          });
      },
      [
        getCurrentLayoutState,
        isMounted,
        mosaicActions,
        mosaicWindowActions,
        panelCatalog,
        savePanelConfigs,
      ],
    );

    const { panelSettingsOpen } = useWorkspace();

    const onPanelRootClick: MouseEventHandler<HTMLDivElement> = useCallback(
      (e) => {
        if (childId == undefined) {
          return;
        }
        if (panelSettingsOpen) {
          // Allow clicking with no modifiers to select a panel (and deselect others) when panel settings are open
          e.stopPropagation(); // select the deepest clicked panel, not parent tab panels
          setSelectedPanelIds([childId]);
        } else if (e.metaKey || shiftKeyPressed || isSelected) {
          e.stopPropagation(); // select the deepest clicked panel, not parent tab panels
          togglePanelSelected(childId, tabId);
        }
      },
      [
        childId,
        tabId,
        togglePanelSelected,
        shiftKeyPressed,
        isSelected,
        setSelectedPanelIds,
        panelSettingsOpen,
      ],
    );

    const groupPanels = useCallback(() => {
      const layout = getCurrentLayoutState().selectedLayout?.data?.layout;
      if (layout == undefined) {
        return;
      }
      createTabPanel({
        idToReplace: childId,
        layout,
        idsToRemove: getSelectedPanelIds(),
        singleTab: true,
      });
    }, [getCurrentLayoutState, getSelectedPanelIds, createTabPanel, childId]);

    const createTabs = useCallback(() => {
      const layout = getCurrentLayoutState().selectedLayout?.data?.layout;
      if (layout == undefined) {
        return;
      }
      createTabPanel({
        idToReplace: childId,
        layout,
        idsToRemove: getSelectedPanelIds(),
        singleTab: false,
      });
    }, [getCurrentLayoutState, getSelectedPanelIds, createTabPanel, childId]);

    const removePanel = useCallback(() => {
      closePanel({
        path: mosaicWindowActions.getPath(),
        root: mosaicActions.getRoot() as MosaicNode<string>,
        tabId,
      });
    }, [closePanel, mosaicActions, mosaicWindowActions, tabId]);

    const splitPanel = useCallback(() => {
      const savedProps = getCurrentLayoutState().selectedLayout?.data?.configById;
      if (!savedProps) {
        return;
      }
      const tabSavedProps = tabId != undefined ? (savedProps[tabId] as TabPanelConfig) : undefined;
      if (tabId != undefined && tabSavedProps != undefined && childId != undefined) {
        const newId = getPanelIdForType(PanelComponent.panelType);
        const activeTabLayout = tabSavedProps.tabs[tabSavedProps.activeTabIdx]?.layout;
        if (activeTabLayout == undefined) {
          return;
        }
        const pathToPanelInTab = getPathFromNode(childId, activeTabLayout);
        const newTabLayout = updateTree(activeTabLayout, [
          {
            path: pathToPanelInTab,
            spec: { $set: { first: childId, second: newId, direction: "row" } },
          },
        ]);
        const newTabConfig = updateTabPanelLayout(newTabLayout, tabSavedProps);
        savePanelConfigs({
          configs: [
            { id: tabId, config: newTabConfig },
            { id: newId, config: panelComponentConfig },
          ],
        });
      } else {
        void mosaicWindowActions.split({ type: PanelComponent.panelType });
      }
    }, [
      childId,
      getCurrentLayoutState,
      mosaicWindowActions,
      panelComponentConfig,
      savePanelConfigs,
      tabId,
    ]);

    const { onMouseMove, enterFullscreen, exitFullscreen } = useMemo(
      () => ({
        onMouseMove: ((e) => {
          if (e.metaKey !== cmdKeyPressed) {
            setCmdKeyPressed(e.metaKey);
          }
        }) as MouseEventHandler<HTMLDivElement>,
        enterFullscreen: () => {
          setFullscreenSourceRect(panelRootRef.current?.getBoundingClientRect());
          setFullscreen(true);

          // When entering fullscreen for a panel within a tab, we need to adjust the ancestor
          // tab(s)'s z-index to have our panel properly overlay other panels outside the tab.
          parentPanelContext?.setHasFullscreenDescendant(true);
        },
        exitFullscreen: () => {
          // Don't clear fullscreenSourceRect or hasFullscreenDescendant, they are needed during the exit transition
          setFullscreen(false);
        },
      }),
      [cmdKeyPressed, parentPanelContext],
    );

    const setHasFullscreenDescendant = useCallback(
      // eslint-disable-next-line @foxglove/no-boolean-parameters
      (value: boolean) => {
        _setHasFullscreenDescendant(value);
        parentPanelContext?.setHasFullscreenDescendant(value);
      },
      [parentPanelContext],
    );

    // We use two separate sets of key handlers because the panel context and exitFullScreen
    // change often and invalidate our key handlers during user interactions.
    const { keyUpHandlers, keyDownHandlers } = useMemo(
      () => ({
        keyUpHandlers: {
          "`": () => setQuickActionsKeyPressed(false),
          "~": () => setQuickActionsKeyPressed(false),
          Shift: () => setShiftKeyPressed(false),
          Meta: () => setCmdKeyPressed(false),
        },
        keyDownHandlers: {
          a: (e: KeyboardEvent) => {
            e.preventDefault();
            if (cmdKeyPressed) {
              selectAllPanels();
            }
          },
          "`": () => setQuickActionsKeyPressed(true),
          "~": () => setQuickActionsKeyPressed(true),
          Shift: () => setShiftKeyPressed(true),
          Meta: () => setCmdKeyPressed(true),
        },
      }),
      [selectAllPanels, cmdKeyPressed],
    );

    const fullScreenKeyHandlers = useMemo(
      () => ({
        Escape: () => exitFullscreen(),
      }),
      [exitFullscreen],
    );

    /* Ensure user exits full-screen mode when leaving window, even if key is still pressed down */
    useEffect(() => {
      const listener = () => {
        exitFullscreen();
        setCmdKeyPressed(false);
        setShiftKeyPressed(false);
        setQuickActionsKeyPressed(false);
      };
      window.addEventListener("blur", listener);
      return () => window.removeEventListener("blur", listener);
    }, [exitFullscreen]);

    const otherPanelProps = useShallowMemo(otherProps);
    const childProps = useMemo(
      // We have to lie to TypeScript with "as PanelProps" because the "PanelProps extends {...}"
      // constraint technically allows the panel to require the types of config/saveConfig be more
      // specific types that aren't satisfied by the functions we pass in
      () => ({ config: panelComponentConfig, saveConfig, ...otherPanelProps } as PanelProps),
      [otherPanelProps, panelComponentConfig, saveConfig],
    );
    const child = useMemo(() => <PanelComponent {...childProps} />, [childProps]);

    const renderCount = useRef(0);

    const perfInfo = useRef<HTMLDivElement>(ReactNull);
    const quickActionsOverlayRef = useRef<HTMLDivElement>(ReactNull);
    const onDragStart = useCallback(() => {
      // Temporarily hide the overlay so that the panel can be shown as the drag preview image --
      // even though the overlay is a sibling rather than a child, Chrome still includes it in the
      // preview if it is visible. Changing the appearance in the next React render cycle is not
      // enough; it actually needs to happen during the dragstart event.
      // https://bugs.chromium.org/p/chromium/issues/detail?id=1203107
      const overlay = quickActionsOverlayRef.current;
      if (overlay) {
        overlay.style.opacity = "0";
        setTimeout(() => (overlay.style.opacity = "1"));
      }
    }, []);
    const dragSpec = { tabId, panelId: childId, onDragStart };
    const [connectOverlayDragSource, connectOverlayDragPreview] = usePanelDrag(dragSpec);
    const [connectToolbarDragHandle, connectToolbarDragPreview] = usePanelDrag(dragSpec);

    return (
      <Profiler
        id={childId ?? "$unknown_id"}
        onRender={(
          _id,
          _phase,
          actualDuration,
          _baseDuration,
          _startTime,
          _commitTime,
          _interactions,
        ) => {
          if (perfInfo.current) {
            perfInfo.current.innerText = `${++renderCount.current}\n${actualDuration.toFixed(1)}ms`;
          }
        }}
      >
        <PanelContext.Provider
          value={{
            type,
            id: childId ?? "$unknown_id",
            title,
            config: panelComponentConfig,
            saveConfig: saveConfig as SaveConfig<PanelConfig>,
            updatePanelConfigs,
            openSiblingPanel,
            enterFullscreen,
            exitFullscreen,
            setHasFullscreenDescendant,
            isFullscreen: fullscreen,
            tabId,
            // disallow dragging the root panel in a layout
            connectToolbarDragHandle: isTopLevelPanel ? undefined : connectToolbarDragHandle,
          }}
        >
          <KeyListener global keyUpHandlers={keyUpHandlers} keyDownHandlers={keyDownHandlers} />
          {fullscreen && <KeyListener global keyDownHandlers={fullScreenKeyHandlers} />}
          <Transition
            in={fullscreen}
            timeout={{ exit: FULLSCREEN_TRANSITION_DURATION_MS }}
            onExited={() => setHasFullscreenDescendant(false)}
            nodeRef={panelRootRef}
          >
            {(fullscreenState) => (
              <PanelRoot
                onClick={onPanelRootClick}
                onMouseMove={onMouseMove}
                hasFullscreenDescendant={hasFullscreenDescendant}
                fullscreenState={fullscreenState}
                sourceRect={fullscreenSourceRect}
                selected={isSelected}
                data-test={`panel-mouseenter-container ${childId ?? ""}`}
                ref={(el) => {
                  panelRootRef.current = el;
                  // disallow dragging the root panel in a layout
                  if (!isTopLevelPanel) {
                    connectOverlayDragPreview(el);
                    connectToolbarDragPreview(el);
                  }
                }}
              >
                {isSelected && !fullscreen && numSelectedPanelsIfSelected > 1 && (
                  <ActionsOverlay>
                    <Button className={classes.tabActionsOverlayButton} onClick={groupPanels}>
                      <Icon size="small" style={{ marginBottom: 5 }}>
                        <BorderAllIcon />
                      </Icon>
                      Group in tab
                    </Button>
                    <Button className={classes.tabActionsOverlayButton} onClick={createTabs}>
                      <Icon size="small" style={{ marginBottom: 5 }}>
                        <ExpandAllOutlineIcon />
                      </Icon>
                      Create {numSelectedPanelsIfSelected} tabs
                    </Button>
                  </ActionsOverlay>
                )}
                {type !== TAB_PANEL_TYPE && quickActionsKeyPressed && !fullscreen && (
                  <ActionsOverlay
                    ref={(el) => {
                      quickActionsOverlayRef.current = el;
                      // disallow dragging the root panel in a layout
                      if (!isTopLevelPanel) {
                        connectOverlayDragSource(el);
                      }
                    }}
                  >
                    <div>
                      <Button className={classes.quickActionsOverlayButton} onClick={removePanel}>
                        <TrashCanOutlineIcon />
                        Remove
                      </Button>
                      <Button className={classes.quickActionsOverlayButton} onClick={splitPanel}>
                        <GridLargeIcon />
                        Split
                      </Button>
                    </div>
                  </ActionsOverlay>
                )}
                <PanelErrorBoundary onRemovePanel={removePanel} onResetPanel={resetPanel}>
                  <React.StrictMode>{child}</React.StrictMode>
                </PanelErrorBoundary>
                {process.env.NODE_ENV !== "production" && (
                  <div className={classes.perfInfo} ref={perfInfo} />
                )}
              </PanelRoot>
            )}
          </Transition>
        </PanelContext.Provider>
      </Profiler>
    );
  }

  return Object.assign(React.memo(ConnectedPanel), {
    defaultConfig: PanelComponent.defaultConfig,
    panelType: PanelComponent.panelType,
    displayName: `Panel(${PanelComponent.displayName ?? PanelComponent.name})`,
  });
}
