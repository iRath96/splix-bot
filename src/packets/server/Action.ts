import Scopes from "../Scope";

/**
 * Packets sent by the server.
 */
export enum Action {
  UPDATE_BLOCKS = 1,
  PLAYER_POS = 2,
  FILL_AREA = 3,
  SET_TRAIL = 4,
  PLAYER_DIE = 5,
  CHUNK_OF_BLOCKS = 6,
  REMOVE_PLAYER = 7,
  PLAYER_NAME = 8,
  MY_SCORE = 9,
  MY_RANK = 10,
  LEADERBOARD = 11,
  MAP_SIZE = 12,
  YOU_DED = 13,
  MINIMAP = 14,
  PLAYER_SKIN = 15,
  EMPTY_TRAIL_WITH_LAST_POS = 16,
  READY = 17,
  PLAYER_HIT_LINE = 18,
  REFRESH_AFTER_DIE = 19,
  PLAYER_HONK = 20,
  PONG = 21,
  UNDO_PLAYER_DIE = 22,
  TEAM_LIFE_COUNT = 23
}

export const Scope = Scopes.SERVER;
