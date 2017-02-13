import { PacketProperty, prop } from "../common/Packet";
import { Integer } from "../types";


export default class Position extends PacketProperty<Position> {
  @prop x: Integer;
  @prop y: Integer;

  get value() {
    return this;
  }
}
