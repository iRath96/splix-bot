import { PacketProperty } from "../common/Packet";


export default class LongInteger extends PacketProperty<number> {
  constructor(
    public value: number = 0
  ) {
    super();
  }

  serialize() {
    return [
      (this.value >> 24) & 255,
      (this.value >> 16) & 255,
      (this.value >> 8) & 255,
      this.value & 255
    ];
  }

  deserialize(raw: number[]) {
    this.value = 0;
    for (let i = 0; i < 4; ++i)
      this.value = (raw.shift() | this.value << 8 >>> 0) >>> 0;
  }
}
