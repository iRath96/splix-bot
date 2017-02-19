import { PacketProperty, prop } from "../common/Packet";
import { Integer } from "../types";


export default class PlayerHandle extends PacketProperty<number> {
  @prop protected playerId = new Integer();

  value: number;

  serialize() {
    this.playerId.value = this.value;
    return super.serialize();
  }

  deserialize(raw: number[]) {
    super.deserialize(raw);
    this.value = this.playerId.value;
  }
}
