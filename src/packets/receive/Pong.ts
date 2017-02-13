import { Packet, id } from "../common/Packet";
import { Scope, Action } from "./Action";


@id(Scope, Action.PONG)
export default class PongPacket extends Packet {
}
