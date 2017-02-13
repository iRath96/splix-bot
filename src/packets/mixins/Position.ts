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
}
