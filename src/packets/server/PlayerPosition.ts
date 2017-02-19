import { Packet, prop, id } from "../common/Packet";
import { Scope, Action } from "./Action";

import { Byte } from "../types";

import PlayerHandle from "../mixins/PlayerHandle";
import Position from "../mixins/Position";
import Vector from "../../common/Vector";


@id(Scope, Action.PLAYER_POS)
export default class PlayerPositionPacket extends Packet {
  @prop position = new Position();
  @prop player = new PlayerHandle();
  @prop direction = new Byte();

  constructor(
    player: number,
    position: Vector,
    direction: number
  ) {
    super();

    this.position.value = position;
    this.player.value = player;
    this.direction.value = direction;
  }
}
