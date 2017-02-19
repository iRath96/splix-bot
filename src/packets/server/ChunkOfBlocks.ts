import { Packet, prop, id } from "../common/Packet";
import { Integer } from "../types";

import { Scope, Action } from "./Action";


@id(Scope, Action.CHUNK_OF_BLOCKS)
export default class ChunkOfBlocksPacket extends Packet {
  @prop x = new Integer();
  @prop y = new Integer();
  @prop width = new Integer();
  @prop height = new Integer();
  
  data: number[] = [];

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
