import { PacketProperty, prop } from "../common/Packet";
import { Integer } from "../types";


export default class Position extends PacketProperty<Position> {
  @prop x = new Integer();
  @prop y = new Integer();

  get value() {
    return this;
  }

  clone() {
    let position = new Position();
    position.x.value = this.x.value;
    position.y.value = this.y.value;
    return position;
  }

  move(direction: number, count: number) {
    switch (direction) {
    case 0: this.x.value += count; break;
    case 1: this.y.value += count; break;
    case 2: this.x.value -= count; break;
    case 3: this.y.value -= count; break;
    }
  }
}
