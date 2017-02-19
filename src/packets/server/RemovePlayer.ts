import { Packet, prop, id } from "../common/Packet";
import { Scope, Action } from "./Action";

import PlayerHandle from "../mixins/PlayerHandle";


@id(Scope, Action.REMOVE_PLAYER)
export default class RemovePlayerPacket extends Packet {
  @prop player = new PlayerHandle();
}
