import { Packet, prop, id } from "../common/Packet";
import { Byte, Integer } from "../types";

import { Scope, Action } from "./Action";


@id(Scope, Action.VERSION)
export default class VersionPacket extends Packet {
  @prop type = new Byte();
  @prop version = new Integer();

  constructor(
    type: number,
    version: number
  ) {
    super();

    this.type = new Byte(type);
    this.version = new Integer(version);
  }
}
