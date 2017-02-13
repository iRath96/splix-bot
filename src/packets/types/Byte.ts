import { PacketProperty } from "../common/Packet";


export default class Byte extends PacketProperty<number> {
  constructor(
    public value: number = 0
  ) {
    super();
  }

  serialize() {
    return [ this.value ];
  }

  deserialize(game: any, raw: number[]) {
    this.value = raw.shift()!;
  }
}
