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
import MyScorePacket from "./packets/receive/MyScore";
import MyRankPacket from "./packets/receive/MyRank";
import LeaderboardPacket from "./packets/receive/Leaderboard";
import MapSizePacket from "./packets/receive/MapSize";
import MinimapPacket from "./packets/receive/Minimap";

import PingPacket from "./packets/send/Ping";
import VersionPacket from "./packets/send/Version";
import SetUsernamePacket from "./packets/send/SetUsername";
import SkinPacket from "./packets/send/Skin";
import RequestMyTrailPacket from "./packets/send/RequestMyTrail";
import ReadyPacket from "./packets/send/Ready";
import UpdateDirectionPacket from "./packets/send/UpdateDirection";


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
  public hasSentSecondReady = false;

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
    this.socket = new WebSocket("ws://207.154.207.54:8001/splix");
    
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

    setInterval(() => {
      this.game.loop();
    }, 100);

    setInterval(() => {
      let player = this.game.players[0];
      if (player && player.position) {
        this.updateDirection(
          (player.direction + 1) % 4,
          player.position.x.value,
          player.position.y.value
        );
      }
    }, 300);
  }

  protected sendHandshake(username: string) {
    this.sendPacket(new PingPacket());
    this.sendPacket(new VersionPacket(0, 28));
    this.sendPacket(new SetUsernamePacket(username));
    this.sendPacket(new SkinPacket(0, 0));
    this.sendPacket(new ReadyPacket());

    this.sendPacket(new RequestMyTrailPacket());
  }

  protected updateDirection(direction: number, x: number, y: number) {
    let packet = new UpdateDirectionPacket();
    packet.direction.value = direction;
    packet.position.x.value = x;
    packet.position.y.value = y;
    this.sendPacket(packet);

    // update local trail
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
    packet.player.value.die();
  }

  @handler
  protected handlePong(packet: PongPacket) {
    // console.log("pong");
  }

  @handler
  protected handleFillArea(packet: FillAreaPacket) {
    this.game.fillArea(
      packet.x.value, packet.y.value,
      packet.width.value, packet.height.value,
      packet.color.value, packet.pattern.value
    );
  }

  @handler
  protected handleChunkOfBlocks(packet: ChunkOfBlocksPacket) {
    this.game.setChunkOfBlocks(
      packet.x.value, packet.y.value,
      packet.width.value, packet.height.value,
      packet.data
    );

    if (!this.hasSentSecondReady) {
      this.sendPacket(new ReadyPacket());
      this.hasSentSecondReady = true;
    }
  }

  @handler
  protected handleSetTrail(packet: SetTrailPacket) {
    packet.player.value.trail = packet.trail;
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
    let player = packet.player.value;
    player.position = packet.position;
    player.direction = packet.direction.value;
    player.trail.push(player.position.clone());
  }

  @handler
  protected handlePlayerName(packet: PlayerNamePacket) {
    packet.player.value.name = packet.name.value;
  }

  @handler
  protected handlePlayerSkin(packet: PlayerSkinPacket) {
    packet.player.value.skin = packet.skin.value;
  }

  @handler
  protected handleMyScore(packet: MyScorePacket) {
    // console.log(packet);
  }

  @handler
  protected handleMyRank(packet: MyRankPacket) {
    // console.log(packet);
  }

  @handler
  protected handleLeaderboard(packet: LeaderboardPacket) {
    // console.log(packet);
  }

  @handler
  protected handleMapSize(packet: MapSizePacket) {
    // console.log(packet);
  }

  @handler
  protected handleMinimap(packet: MinimapPacket) {
    // console.log(packet);
  }
}
