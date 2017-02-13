import { PacketProperty, prop } from "../common/Packet";
import { Integer } from "../types";


export default class Position extends PacketProperty<Position> {
  @prop x = new Integer();
  @prop y = new Integer();

  get value() {
    return this;
  }
}
