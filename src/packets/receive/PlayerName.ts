import { Packet, prop, id } from "../common/Packet";
import { String } from "../types";
import { Scope, Action } from "./Action";

import PlayerHandle from "../mixins/PlayerHandle";


@id(Scope, Action.PLAYER_NAME)
export default class PlayerNamePacket extends Packet {
  @prop player = new PlayerHandle();
  @prop name = new String();
}
