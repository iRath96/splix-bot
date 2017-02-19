import { Packet, prop, id } from "../common/Packet";
import { Integer, Byte } from "../types";

import { Scope, Action } from "./Action";


@id(Scope, Action.FILL_AREA)
export default class FillAreaPacket extends Packet {
  @prop x = new Integer();
  @prop y = new Integer();
  @prop width = new Integer();
  @prop height = new Integer();
  @prop color = new Byte();
  @prop pattern = new Byte();

  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    pattern: number
  ) {
    // @todo These constructors should be automatically generated
    
    super();

    this.x.value = x;
    this.y.value = y;
    this.width.value = width;
    this.height.value = height;
    this.color.value = color;
    this.pattern.value = pattern;
  }
}
