import { PacketProperty } from "../common/Packet";


export default class Integer extends PacketProperty<number> {
  constructor(
    public value: number = 0
  ) {
    super();
  }

  serialize() {
    return [
      (this.value >> 8) & 255,
      this.value & 255
    ];
  }

  deserialize(raw: number[]) {
    this.value = raw.shift()!;
    this.value = (raw.shift() | this.value << 8 >>> 0) >>> 0;
  }
}
