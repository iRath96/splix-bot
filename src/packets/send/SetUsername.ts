import { Packet, prop, id } from "../common/Packet";
import { String } from "../types";

import { Scope, Action } from "./Action";

@id(Scope, Action.SET_USERNAME)
export default class SetUsernamePacket extends Packet {
  @prop username = new String();

  constructor(
    username: string
  ) {
    super();
    this.username = new String(username);
  }
}
