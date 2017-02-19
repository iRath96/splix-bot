import { Packet, prop, id } from "../common/Packet";
import { Scope, Action } from "./Action";

import PlayerHandle from "../mixins/PlayerHandle";
import Position from "../mixins/Position";



@id(Scope, Action.EMPTY_TRAIL_WITH_LAST_POS)
export default class EmptyTrailPacket extends Packet {
  @prop player = new PlayerHandle();
  @prop lastPosition = new Position();
}
