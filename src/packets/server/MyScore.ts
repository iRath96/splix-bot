import { Packet, prop, id } from "../common/Packet";
import { LongInteger, Integer } from "../types";
import { Scope, Action } from "./Action";


@id(Scope, Action.MY_SCORE)
export default class MyScorePacket extends Packet {
  @prop score = new LongInteger();
  @prop kills = new Integer();
}
