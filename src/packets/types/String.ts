import { PacketProperty } from "../common/Packet";


export default class StringProperty extends PacketProperty<string> {
  constructor(
    public value: string = ""
  ) {
    super();
  }

  serialize() {
    for (var b = [], c = 0; c < this.value.length; ++c) {
      let d = this.value.charCodeAt(c);
      if (d < 128)
        b.push(d)
      else if (d < 2048)
        b.push(192 | d >> 6, 128 | 63 & d)
      else if (d < 55296 || d >= 57344)
        b.push(224 | d >> 12, 128 | d >> 6 & 63, 128 | 63 & d)
      else {
        ++c;
        d = 65536 + ((1023 & d) << 10 | 1023 & this.value.charCodeAt(c));
        b.push(240 | d >> 18, 128 | d >> 12 & 63, 128 | d >> 6 & 63, 128 | 63 & d);
      }
    }

    return b;
  }

  deserialize(game: any, raw: number[]) {
    for (var b = "", d = raw.length, c = 0; c < d;) {
      let e = raw[c++];
      switch (e >> 4) {
      case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7: {
        b += String.fromCharCode(e);
        break;
      }
      case 12:
      case 13: {
        let f = raw[c++];
        b += String.fromCharCode((31 & e) << 6 | 63 & f);
        break;
      }
      case 14: {
        let f = raw[c++];
        let g = raw[c++];
        b += String.fromCharCode((15 & e) << 12 | (63 & f) << 6 | (63 & g) << 0);
      }
      }
    }
    
    this.value = b;
  }
}
