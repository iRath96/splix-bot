import Game from "./Game";

import { Packet } from "./packets/common/Packet";
import Scope from "./packets/Scope";

import PlayerDeathPacket from "./packets/receive/PlayerDeath";
import FillAreaPacket from "./packets/receive/FillArea";

import PingPacket from "./packets/send/Ping";
import VersionPacket from "./packets/send/Version";
import SetUsernamePacket from "./packets/send/SetUsername";
import SkinPacket from "./packets/send/Skin";
import ReadyPacket from "./packets/send/Ready";


const handler: PropertyDecorator = function (target: { constructor: typeof Manager }, property: string) {
  let types = Reflect.getMetadata("design:paramtypes", target, property);

  target.constructor.handlers.push([
    <typeof Packet>types[0],
    property
  ]);
};

export default class Manager {
  [key: string]: any;

  static handlers: [ typeof Packet, string ][] = [];

  public game = new Game();

  protected sendPacket(packet: Packet) {
    console.log(packet.serialize());
  }

  protected recvPacket(raw: number[]) {
    let packet = Packet.deserialize(Scope.RECEIVE, this.game, raw);
    this.handlePacket(packet);
  }

  protected handlePacket(packet: Packet) {
    let handler = (<any>Manager.handlers).find((handler: any) =>
      handler[0] === packet.class
    );
    
    this[handler![1]](packet);
  }

  //
  // methods
  //

  protected init(username: string) {
    this.sendPacket(new PingPacket());
    this.sendPacket(new VersionPacket(0, 28));
    this.sendPacket(new SetUsernamePacket(username));
    this.sendPacket(new SkinPacket(0, 0));
    this.sendPacket(new ReadyPacket());
  }

  static manage() {
    let m = new Manager();
    m.init("Alex");

    let t = new FillAreaPacket();
    t.x.value = 100;
    t.height.value = 200;
    console.log(t.serialize());
    m.recvPacket(t.serialize());
  }

  //
  // handlers
  //

  @handler
  protected handlePlayerDeath(packet: PlayerDeathPacket) {
    console.log(packet);
    //packet.player.value.die();
  }

  @handler
  protected handleFillArea(packet: FillAreaPacket) {
    console.log(packet);
  }
}
