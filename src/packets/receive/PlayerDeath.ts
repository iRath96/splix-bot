import { Packet, prop, id } from "../common/Packet";
import { Scope, Action } from "./Action";

import PlayerHandle from "../mixins/PlayerHandle";
import Position from "../mixins/Position";


@id(Scope, Action.PLAYER_DIE)
export default class PlayerDeathPacket extends Packet {
  @prop player = new PlayerHandle();
  position: Position | null = null;

  serialize() {
    let raw = super.serialize();
    if (this.position !== null)
      raw = [ ...raw, ...this.position.serialize() ];
    return raw;
  }

  deserialize(game: any, raw: number[]) {
    super.deserialize(game, raw);
    
    if (raw.length > 0) {
      this.position = new Position();
      this.position.deserialize(game, raw);
    }
  }
}
