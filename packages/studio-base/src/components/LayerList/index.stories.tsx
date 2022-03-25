// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Box } from "@mui/material";

import MockMessagePipelineProvider from "@foxglove/studio-base/components/MessagePipeline/MockMessagePipelineProvider";
import ModalHost from "@foxglove/studio-base/context/ModalHost";
import { PlayerPresence } from "@foxglove/studio-base/players/types";

import { LayerList } from ".";

export default {
  title: "components/LayerList",
  component: LayerList,
};

export const PlayerNotPresent = (): JSX.Element => {
  return (
    <ModalHost>
      <MockMessagePipelineProvider noActiveData presence={PlayerPresence.NOT_PRESENT}>
        <Box height="100vh" overflow="auto">
          <LayerList />
        </Box>
      </MockMessagePipelineProvider>
    </ModalHost>
  );
};

export const PlayerIntializing = (): JSX.Element => {
  return (
    <ModalHost>
      <MockMessagePipelineProvider presence={PlayerPresence.INITIALIZING}>
        <Box height="100vh" overflow="auto">
          <LayerList />
        </Box>
      </MockMessagePipelineProvider>
    </ModalHost>
  );
};

export const PlayerPresent = (): JSX.Element => {
  return (
    <ModalHost>
      <MockMessagePipelineProvider presence={PlayerPresence.PRESENT}>
        <Box height="100vh" overflow="auto">
          <LayerList />
        </Box>
      </MockMessagePipelineProvider>
    </ModalHost>
  );
};

export const PlayerWithError = (): JSX.Element => {
  return (
    <ModalHost>
      <MockMessagePipelineProvider presence={PlayerPresence.ERROR}>
        <Box height="100vh" overflow="auto">
          <LayerList />
        </Box>
      </MockMessagePipelineProvider>
    </ModalHost>
  );
};
