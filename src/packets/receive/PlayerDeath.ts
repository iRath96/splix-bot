import { Packet, prop, id } from "../common/Packet";
import { Scope, Action } from "./Action";

import PlayerHandle from "../mixins/PlayerHandle";
import Position from "../mixins/Position";


@id(Scope, Action.PLAYER_DIE)
export default class PlayerDeathPacket extends Packet {
  @prop player = new PlayerHandle();
  @prop position = new Position();
}
