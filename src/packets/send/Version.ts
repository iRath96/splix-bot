import { Packet, prop, id } from "../common/Packet";
import { Byte } from "../types";

import { Scope, Action } from "./Action";


@id(Scope, Action.VERSION)
export default class VersionPacket extends Packet {
  @prop type = new Byte();
  @prop version = new Byte();

  constructor(
    type: number,
    version: number
  ) {
    super();

    this.type = new Byte(type);
    this.version = new Byte(version);
  }
}
