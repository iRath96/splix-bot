import { Packet, prop, id } from "../common/Packet";
import { Integer } from "../types";
import { Scope, Action } from "./Action";


@id(Scope, Action.MY_RANK)
export default class MyRankPacket extends Packet {
  @prop rank = new Integer();
}
