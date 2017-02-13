import { Packet, prop, id } from "../common/Packet";
import { Integer } from "../types";

import { Scope, Action } from "./Action";


@id(Scope, Action.MAP_SIZE)
export default class MapSizePacket extends Packet {
  @prop size = new Integer();
}
