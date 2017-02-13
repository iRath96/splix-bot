import Player from "./Player";


export default class Game {
  blocks: number[][];
  players: { [id: number]: Player } = {};

  getPlayer(id: number) {
    if (!this.players.hasOwnProperty(String(id)))
      this.players[id] = new Player(id);
    return this.players[id];
  }

  removePlayer(player: Player) {
    delete this.players[player.id];
  }
}
