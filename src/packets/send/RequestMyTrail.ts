import { Packet, id } from "../common/Packet";
import { Scope, Action } from "./Action";


@id(Scope, Action.REQUEST_MY_TRAIL)
export default class RequestMyTrailPacket extends Packet {
}
