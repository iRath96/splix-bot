import { Packet, prop, id } from "../common/Packet";
import { Integer } from "../types";

import { Scope, Action } from "./Action";


@id(Scope, Action.CHUNK_OF_BLOCKS)
export default class ChunkOfBlocksPacket extends Packet {
  @prop x = new Integer();
  @prop y = new Integer();
  @prop width = new Integer();
  @prop height = new Integer();
  
  data: number[];

  constructor(
    x: number = 0,
    y: number = 0,
    width: number = 0,
    height: number = 0,
    data: number[] = []
  ) {
    super();
    
    this.x.value = x;
    this.y.value = y;
    this.width.value = width;
    this.height.value = height;
    this.data = data;
  }

  serialize() {
    return [
      ...super.serialize(),
      ...this.data
    ];
  }

  deserialize(raw: number[]) {
    super.deserialize(raw);
    this.data = raw.splice(0);
  }
}
