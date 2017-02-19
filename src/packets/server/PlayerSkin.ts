import { Packet, prop, id } from "../common/Packet";
import { Byte } from "../types";
import { Scope, Action } from "./Action";

import PlayerHandle from "../mixins/PlayerHandle";


@id(Scope, Action.PLAYER_SKIN)
export default class PlayerSkinPacket extends Packet {
  @prop player = new PlayerHandle();
  @prop skin = new Byte();
}
