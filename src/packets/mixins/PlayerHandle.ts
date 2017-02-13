import { PacketProperty, prop } from "../common/Packet";
import { Integer } from "../types";
import Game from "../../Game";
import Player from "../../Player";


export default class PlayerHandle extends PacketProperty<Player> {
  @prop protected playerId: Integer;

  value: Player;

  serialize() {
    this.playerId.value = this.value.id;
    return super.serialize();
  }

  deserialize(game: Game, raw: number[]) {
    super.deserialize(game, raw);
    this.value = game.players[this.playerId.value];
  }
}
