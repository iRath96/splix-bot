import { Packet, prop, id } from "../common/Packet";
import { Scope, Action } from "./Action";

import PlayerHandle from "../mixins/PlayerHandle";
import Position from "../mixins/Position";
import Vector from "../../common/Vector";


@id(Scope, Action.SET_TRAIL)
export default class SetTrailPacket extends Packet {
  @prop player = new PlayerHandle();
  trail: Position[];

  constructor(
    player: number = 0,
    trail: Vector[] = []
  ) {
    super();

    this.player.value = player;
    this.trail = trail.map(vector => new Position(vector));
  }

  serialize() {
    return this.trail.reduce((raw, position) =>
      [ ...raw, ...position.serialize() ]
    , super.serialize());
  }

  deserialize(raw: number[]) {
    super.deserialize(raw);
    while (raw.length > 0) {
      let position = new Position();
      position.deserialize(raw);
      this.trail.push(position);
    }
  }
}
