// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { renderHook } from "@testing-library/react-hooks";
import { PropsWithChildren } from "react";

import MockMessagePipelineProvider from "@foxglove/studio-base/components/MessagePipeline/MockMessagePipelineProvider";
import { useCurrentLayoutActions } from "@foxglove/studio-base/context/CurrentLayoutContext";
import CurrentUserContext, { User } from "@foxglove/studio-base/context/CurrentUserContext";
import PlayerSelectionContext, {
  PlayerSelection,
} from "@foxglove/studio-base/context/PlayerSelectionContext";
import { useInitialDeepLinkState } from "@foxglove/studio-base/hooks/useInitialDeepLinkState";
import { useSessionStorageValue } from "@foxglove/studio-base/hooks/useSessionStorageValue";

jest.mock("@foxglove/studio-base/hooks/useSessionStorageValue");
jest.mock("@foxglove/studio-base/context/CurrentLayoutContext");

type WrapperProps = {
  currentUser?: User;
  playerSelection: PlayerSelection;
};

function Wrapper({ children, currentUser, playerSelection }: PropsWithChildren<WrapperProps>) {
  const userContextValue = {
    currentUser,
    signIn: () => undefined,
    signOut: async () => undefined,
  };
  return (
    <MockMessagePipelineProvider
      topics={[]}
      datatypes={new Map()}
      capabilities={["hello"]}
      messages={[]}
      urlState={{ sourceId: "test", parameters: { url: "testurl", param: "one" } }}
      startTime={{ sec: 0, nsec: 1 }}
    >
      <CurrentUserContext.Provider value={userContextValue}>
        <PlayerSelectionContext.Provider value={playerSelection}>
          {children}
        </PlayerSelectionContext.Provider>
      </CurrentUserContext.Provider>
    </MockMessagePipelineProvider>
  );
}

describe("Initial deep link state", () => {
  const selectSource = jest.fn();
  const setSelectedLayoutId = jest.fn();
  const emptyPlayerSelection = {
    selectSource,
    selectRecent: () => {},
    availableSources: [],
    recentSources: [],
    selectedSource: undefined,
  };

  beforeEach(() => {
    (useSessionStorageValue as jest.Mock).mockReturnValue(["web", jest.fn()]);
    (useCurrentLayoutActions as jest.Mock).mockReturnValue({ setSelectedLayoutId });
    selectSource.mockClear();
    setSelectedLayoutId.mockClear();
  });

  it("doesn't select a source without ds params", () => {
    renderHook(() => useInitialDeepLinkState(["https://studio.foxglove.dev/?foo=bar"]), {
      initialProps: { playerSelection: emptyPlayerSelection },
      wrapper: Wrapper,
    });

    expect(selectSource).not.toHaveBeenCalled();
  });

  it("selects the sample datasource from the link", () => {
    renderHook(() => useInitialDeepLinkState(["https://studio.foxglove.dev/?ds=sample-nuscenes"]), {
      initialProps: { playerSelection: emptyPlayerSelection },
      wrapper: Wrapper,
    });

    expect(selectSource).toHaveBeenCalledWith("sample-nuscenes", {
      params: undefined,
      type: "connection",
    });
    expect(setSelectedLayoutId).not.toHaveBeenCalled();
  });

  it("selects a connection datasource from the link", () => {
    renderHook(
      () =>
        useInitialDeepLinkState([
          "http://localhost:8080/?ds=rosbridge-websocket&ds.url=ws%3A%2F%2Flocalhost%3A9090&layoutId=a288e116-d177-4b57-8f30-6ada61919638",
        ]),
      {
        initialProps: { playerSelection: emptyPlayerSelection },
        wrapper: Wrapper,
      },
    );

    expect(selectSource).toHaveBeenCalledWith("rosbridge-websocket", {
      params: { url: "ws://localhost:9090" },
      type: "connection",
    });
    expect(setSelectedLayoutId).toHaveBeenCalledWith("a288e116-d177-4b57-8f30-6ada61919638");
  });

  it("waits for a current user to select a data platform source", () => {
    const { result, rerender } = renderHook<
      WrapperProps,
      ReturnType<typeof useInitialDeepLinkState>
    >(
      () =>
        useInitialDeepLinkState([
          "https://studio.foxglove.dev/?ds=foxglove-data-platform&ds.deviceId=dev&layoutId=12345",
        ]),
      {
        initialProps: { currentUser: undefined, playerSelection: emptyPlayerSelection },
        wrapper: Wrapper,
      },
    );

    expect(result.current.currentUserRequired).toBeTruthy();

    expect(selectSource).not.toHaveBeenCalled();

    rerender({
      currentUser: {
        id: "id",
        email: "email",
        orgId: "org",
        orgDisplayName: "org name",
        orgSlug: "org",
        orgPaid: true,
      },
      playerSelection: emptyPlayerSelection,
    });

    expect(selectSource).toHaveBeenCalledWith("foxglove-data-platform", {
      params: { deviceId: "dev" },
      type: "connection",
    });

    expect(setSelectedLayoutId).toHaveBeenCalledWith("12345");
  });
});
