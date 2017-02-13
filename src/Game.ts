import Player from "./Player";

export default class Game {
  blocks: number[][];
  players: { [id: number]: Player };
}
