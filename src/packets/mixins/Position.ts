import { PacketProperty, prop } from "../common/Packet";
import { Integer } from "../types";

import Vector from "../../common/Vector";


export default class Position extends PacketProperty<Vector> {
  @prop x = new Integer();
  @prop y = new Integer();

  value = new Vector();

  serialize() {
    this.x.value = this.value.x;
    this.y.value = this.value.y;
    return super.serialize();
  }

  deserialize(game: any, raw: number[]) {
    super.deserialize(game, raw);
    this.value.x = this.x.value;
    this.value.y = this.y.value;
  }
}
