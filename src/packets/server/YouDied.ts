import { Packet, id } from "../common/Packet";
import { Scope, Action } from "./Action";


@id(Scope, Action.YOU_DED)
export default class YouDiedPacket extends Packet {
  // @todo
}
