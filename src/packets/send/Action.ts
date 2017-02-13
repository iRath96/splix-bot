import Scopes from "../Scope";

export enum Action {
  UPDATE_DIR = 1,
  SET_USERNAME = 2,
  SKIN = 3,
  READY = 4,
  REQUEST_CLOSE = 5,
  HONK = 6,
  PING = 7,
  REQUEST_MY_TRAIL = 8,
  MY_TEAM_URL = 9,
  SET_TEAM_USERNAME = 10,
  VERSION = 11,
  PATREON_CODE = 12
}

export const Scope = Scopes.RECEIVE;
