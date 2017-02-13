import * as WebSocket from "ws";

import Game from "./Game";

import { Packet } from "./packets/common/Packet";
import Scope from "./packets/Scope";

import PlayerDeathPacket from "./packets/receive/PlayerDeath";
import FillAreaPacket from "./packets/receive/FillArea";
import ChunkOfBlocksPacket from "./packets/receive/ChunkOfBlocks";
import SetTrailPacket from "./packets/receive/SetTrail";
import EmptyTrailPacket from "./packets/receive/EmptyTrail";
import PongPacket from "./packets/receive/Pong";
import RemovePlayerPacket from "./packets/receive/RemovePlayer";
import ServerReadyPacket from "./packets/receive/Ready";
import PlayerPositionPacket from "./packets/receive/PlayerPosition";
import PlayerNamePacket from "./packets/receive/PlayerName";
import PlayerSkinPacket from "./packets/receive/PlayerSkin";

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
  public socket: WebSocket;

  protected sendPacket(packet: Packet) {
    this.socket.send(new Uint8Array(packet.serialize()));
  }

  protected recvPacket(raw: number[]) {
    let packet = Packet.deserialize(Scope.RECEIVE, this.game, raw);
    this.handlePacket(packet);
  }

  protected handlePacket(packet: Packet) {
    let handler = (<any>Manager.handlers).find((handler: any) =>
      handler[0] === packet.class
    );
    
    if (handler === undefined)
      throw new Error(`No handler for packet-id ${packet.class.packetId}`);

    this[handler![1]](packet);
  }

  //
  // methods
  //

  protected connect() {
    this.socket = new WebSocket("ws://46.101.194.190:8002/splix");
    
    this.socket.onopen = () => {
      this.sendHandshake("Cheese");
    };

    this.socket.onmessage = msg => {
      let uData = new Uint8Array(msg.data);
      let data = (<any>Array).from(uData);

      try {
        this.recvPacket(data);
      } catch (e) {
        console.log("Failed to parse packet", uData);
        console.error(e);
      }
    };
  }

  protected sendHandshake(username: string) {
    this.sendPacket(new PingPacket());
    this.sendPacket(new VersionPacket(0, 28));
    this.sendPacket(new SetUsernamePacket(username));
    this.sendPacket(new SkinPacket(0, 0));
    this.sendPacket(new ReadyPacket());
  }

  static manage() {
    let m = new Manager();
    m.connect();
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

  @handler
  protected handlePong(packet: PongPacket) {
    console.log("pong");
  }

  @handler
  protected handleChunkOfBlocks(packet: ChunkOfBlocksPacket) {
    console.log(packet.width);
    console.log(packet.height);
    this.sendPacket(new ReadyPacket());
  }

  @handler
  protected handleSetTrail(packet: SetTrailPacket) {
    console.log(packet);
  }

  @handler
  protected handleReady(packet: ServerReadyPacket) {
    console.log(packet);
  }

  @handler
  protected handleEmptyTrail(packet: EmptyTrailPacket) {
    packet.player.value.trail = [];
    if (packet.lastPosition !== null)
      packet.player.value.position = packet.lastPosition;
  }

  @handler
  protected handleRemovePlayer(packet: RemovePlayerPacket) {
    this.game.removePlayer(packet.player.value);
  }

  @handler
  protected handlePlayerPosition(packet: PlayerPositionPacket) {
    packet.player.value.position = packet.position;
  }

  @handler
  protected handlePlayerName(packet: PlayerNamePacket) {
    packet.player.value.name = packet.name.value;
  }

  @handler
  protected handlePlayerSkin(packet: PlayerSkinPacket) {
    packet.player.value.skin = packet.skin.value;
  }
}
