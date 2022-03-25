// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import BlurOnIcon from "@mui/icons-material/BlurOn";
import ClearIcon from "@mui/icons-material/Clear";
import LayersIcon from "@mui/icons-material/Layers";
import SearchIcon from "@mui/icons-material/Search";
import {
  AppBar,
  List,
  Typography,
  styled as muiStyled,
  TextField,
  IconButton,
  CircularProgress,
  ListItem,
  ListItemText,
  Skeleton,
  ListItemIcon,
} from "@mui/material";
import { Fzf, FzfResultItem } from "fzf";
import { useMemo, useState } from "react";

import { Topic } from "@foxglove/studio";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@foxglove/studio-base/components/MessagePipeline";
import Stack from "@foxglove/studio-base/components/Stack";
import { PlayerPresence } from "@foxglove/studio-base/players/types";

import { NestedListItem } from ".";

const itemToFzfResult = (item: Topic) =>
  ({
    item,
    score: 0,
    positions: new Set<number>(),
    start: 0,
    end: 0,
  } as FzfResultItem<Topic>);

const HighlightChars = ({ str, indices }: { str: string; indices: Set<number> }) => {
  const chars = str.split("");

  const nodes = chars.map((char, i) => {
    if (indices.has(i)) {
      return (
        <Typography component="b" key={i} variant="inherit" color="info.main">
          {char}
        </Typography>
      );
    }
    return char;
  });

  return <>{nodes}</>;
};

const StyledAppBar = muiStyled(AppBar, { skipSx: true })(({ theme }) => ({
  top: -1,
  zIndex: theme.zIndex.appBar - 1,
  borderBottom: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(1),
}));

const StyledListItem = muiStyled(ListItem)(({ theme }) => ({
  ".MuiListItemIcon-root": {
    minWidth: theme.spacing(4.5),
    paddingLeft: theme.spacing(1),
    opacity: 0.3,
  },
  "&:hover": {
    ".MuiListItemIcon-root": {
      opacity: 0.6,
    },
  },
}));

const selectPlayerPresence = ({ playerState }: MessagePipelineContext) => playerState.presence;

export function LayerList(): JSX.Element {
  const [filterText, setFilterText] = useState<string>("");
  const playerPresence = useMessagePipeline(selectPlayerPresence);
  const topics = useMessagePipeline((ctx) => ctx.playerState.activeData?.topics ?? []);

  const filteredTopics: FzfResultItem<Topic>[] = useMemo(
    () =>
      filterText
        ? new Fzf(topics, {
            fuzzy: filterText.length > 2 ? "v2" : false,
            sort: true,
            selector: (topic) => topic.name,
          }).find(filterText)
        : topics.map((t) => itemToFzfResult(t)),
    [filterText, topics],
  );

  if (playerPresence === PlayerPresence.ERROR) {
    return (
      <Stack flex="auto" padding={2} fullHeight alignItems="center" justifyContent="center">
        <Typography align="center" color="text.secondary">
          An error occurred
        </Typography>
      </Stack>
    );
  }

  if (
    playerPresence === PlayerPresence.INITIALIZING ||
    playerPresence === PlayerPresence.RECONNECTING
  ) {
    return (
      <>
        <StyledAppBar position="sticky" color="default" elevation={0}>
          <TextField
            disabled
            variant="filled"
            fullWidth
            placeholder="Filter by topic or datatype"
            InputProps={{
              startAdornment: <SearchIcon fontSize="small" />,
              endAdornment: <CircularProgress size={20} />,
            }}
          />
        </StyledAppBar>
        <List key="loading" dense disablePadding>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((i) => (
            <StyledListItem divider key={i}>
              <ListItemText primary={<Skeleton animation={false} width="20%" />} />
            </StyledListItem>
          ))}
        </List>
      </>
    );
  }
  return (
    <Stack>
      <StyledAppBar position="sticky" color="default" elevation={0}>
        <TextField
          disabled={playerPresence !== PlayerPresence.PRESENT}
          onChange={(event) => setFilterText(event.target.value)}
          value={filterText}
          variant="filled"
          fullWidth
          placeholder="Filter by layer name"
          InputProps={{
            startAdornment: <SearchIcon fontSize="small" />,
            endAdornment: filterText && (
              <IconButton
                size="small"
                title="Clear search"
                onClick={() => setFilterText("")}
                edge="end"
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            ),
          }}
        />
      </StyledAppBar>
      <List disablePadding dense>
        <NestedListItem
          // defaultOpen
          divider
          primary="Title"
          items={filteredTopics
            .map(({ item }, idx) => ({
              key: `${idx}-${item.name}`,
              primary: item.name,
            }))
            .reverse()}
        />

        {filteredTopics.map(({ item, positions }) => (
          <StyledListItem divider key={item.name}>
            <ListItemIcon>{item.icon ?? <LayersIcon />}</ListItemIcon>
            <ListItemText
              primary={<HighlightChars str={item.name} indices={positions} />}
              primaryTypographyProps={{ noWrap: true, title: item.name }}
            />
          </StyledListItem>
        ))}
      </List>
    </Stack>
  );
}
