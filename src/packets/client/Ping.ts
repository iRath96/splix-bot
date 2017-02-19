import { Packet, id } from "../common/Packet";
import { Scope, Action } from "./Action";


@id(Scope, Action.PING)
export default class PingPacket extends Packet {
  // the most complex packet of them all
}
