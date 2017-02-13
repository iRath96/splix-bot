import { Packet, id } from "../common/Packet";
import { Scope, Action } from "./Action";


@id(Scope, Action.READY)
export default class ReadyPacket extends Packet {
}
