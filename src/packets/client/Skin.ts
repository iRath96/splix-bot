import { Packet, prop, id } from "../common/Packet";
import { Integer } from "../types";

import { Scope, Action } from "./Action";


@id(Scope, Action.SKIN)
export default class SkinPacket extends Packet {
  @prop color = new Integer();
  @prop pattern = new Integer();

  constructor(
    color: number,
    pattern: number
  ) {
    super();

    this.color = new Integer(color);
    this.pattern = new Integer(pattern);
  }
}
