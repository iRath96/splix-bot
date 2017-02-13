import { Packet, prop, id } from "../common/Packet";
import { Scope, Action } from "./Action";

import PlayerHandle from "../mixins/PlayerHandle";
import Position from "../mixins/Position";


@id(Scope, Action.SET_TRAIL)
export default class SetTrailPacket extends Packet {
  @prop player = new PlayerHandle();
  
  trail: Position[] = [];

  serialize() {
    return this.trail.reduce((raw, position) =>
      [ ...raw, ...position.serialize() ]
    , super.serialize());
  }

  deserialize(game: any, raw: number[]) {
    super.deserialize(game, raw);
    while (raw.length > 0) {
      let position = new Position();
      position.deserialize(game, raw);
      this.trail.push(position);
    }
  }
}
