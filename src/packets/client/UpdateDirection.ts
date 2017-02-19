import { Packet, prop, id } from "../common/Packet";
import { Scope, Action } from "./Action";

import { Byte } from "../types";
import Position from "../mixins/Position";


@id(Scope, Action.UPDATE_DIR)
export default class UpdateDirectionPacket extends Packet {
  @prop direction = new Byte();
  @prop position = new Position();
}
