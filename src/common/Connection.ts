import * as WebSocket from "ws";
import { EventEmitter } from "events";

import Game from "./Game";

import { Packet } from "../packets/common/Packet";
import Scope from "../packets/Scope";

import PlayerDeathPacket from "../packets/receive/PlayerDeath";
import FillAreaPacket from "../packets/receive/FillArea";
import ChunkOfBlocksPacket from "../packets/receive/ChunkOfBlocks";
import SetTrailPacket from "../packets/receive/SetTrail";
import EmptyTrailPacket from "../packets/receive/EmptyTrail";
import PongPacket from "../packets/receive/Pong";
import RemovePlayerPacket from "../packets/receive/RemovePlayer";
import ServerReadyPacket from "../packets/receive/Ready";
import PlayerPositionPacket from "../packets/receive/PlayerPosition";
import PlayerNamePacket from "../packets/receive/PlayerName";
import PlayerSkinPacket from "../packets/receive/PlayerSkin";
import MyScorePacket from "../packets/receive/MyScore";
import MyRankPacket from "../packets/receive/MyRank";
import LeaderboardPacket from "../packets/receive/Leaderboard";
import MapSizePacket from "../packets/receive/MapSize";
import MinimapPacket from "../packets/receive/Minimap";
import YouDiedPacket from "../packets/receive/YouDied";

import PingPacket from "../packets/send/Ping";
import VersionPacket from "../packets/send/Version";
import SetUsernamePacket from "../packets/send/SetUsername";
import SkinPacket from "../packets/send/Skin";
import RequestMyTrailPacket from "../packets/send/RequestMyTrail";
import ReadyPacket from "../packets/send/Ready";
import UpdateDirectionPacket from "../packets/send/UpdateDirection";


const handler: PropertyDecorator = function (target: { constructor: typeof Connection }, property: string) {
  let types = Reflect.getMetadata("design:paramtypes", target, property);

  target.constructor.handlers.push([
    <typeof Packet>types[0],
    property
  ]);
};

const PING_BUFFER_COUNT = 3;
const PING_INTERVAL = 5000; /* ms */

export interface IConnectionOptions {
  url: string;
  name: string;
}

export default class Connection extends EventEmitter {
  [key: string]: any;

  static handlers: [ typeof Packet, string ][] = [];

  public readonly game = new Game();
  public hasSentSecondReady = false;

  public socket: WebSocket | null = null;

  public pendingPing: Date | null = null;
  public lastPings: number[] = [];

  protected intervals: number[] = [];

  constructor(
    public readonly options: IConnectionOptions
  ) {
    super();
    this.connect();
  }

  //
  // methods
  //

  get isConnected() {
    return this.socket !== null;
  }

  protected sendPacket(packet: Packet) {
    this.socket!.send(new Uint8Array(packet.serialize()));
  }

  protected recvPacket(raw: number[]) {
    let packet = Packet.deserialize(Scope.RECEIVE, this.game, raw);
    this.handlePacket(packet);
  }

  protected handlePacket(packet: Packet) {
    let handler = (<any>Connection.handlers).find((handler: any) =>
      handler[0] === packet.class
    );
    
    if (handler === undefined)
      throw new Error(`No handler for packet-id ${packet.class.packetId}`);

    this[handler![1]](packet);
  }

  protected setInterval(handler: Function, timeout: number) {
    this.intervals.push(setInterval(handler, timeout));
  }

  protected clearIntervals() {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
  }

  //
  // connecting
  //

  protected connect() {
    this.socket = new WebSocket(this.options.url);
    console.log(
      `Join your bot at http://splix.io/#ip-${this.options.url.split("/")[2]}`
    );
    
    this.socket.onopen = () => {
      this.handleConnected();
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

  protected handleConnected() {
    this.sendHandshake(this.options.name);
    this.startPinging();

    this.emit("open");
  }

  protected sendHandshake(username: string) {
    this.sendPacket(new VersionPacket(0, 28));
    this.sendPacket(new SetUsernamePacket(username));
    this.sendPacket(new SkinPacket(0, 0));
    this.sendPacket(new ReadyPacket());

    this.sendPacket(new RequestMyTrailPacket());
  }

  protected disconnect() {
    this.socket = null;
    this.clearIntervals();

    this.emit("close");
  }

  //
  // pings
  //

  /**
   * Average roundtrip time.
   */
  get averagePing() {
    if (this.lastPings.length === 0)
      return 0;
    return this.lastPings.reduce((sum, a) => sum + a) / this.lastPings.length;
  }

  protected startPinging() {
    this.setInterval(() => {
      this.sendPing();
    }, PING_INTERVAL);
  }

  protected sendPing() {
    if (this.pendingPing !== null)
      return;
    
    this.sendPacket(new PingPacket());
    this.pendingPing = new Date();
  }

  @handler
  protected handlePong(packet: PongPacket) {
    if (this.pendingPing === null)
      return;
    
    let delay = new Date().getTime() - this.pendingPing.getTime();
    this.lastPings.push(delay);

    while (this.lastPings.length > PING_BUFFER_COUNT)
      this.lastPings.shift();

    this.pendingPing = null;
  }

  //
  // other
  //

  public update() {
    this.game.loop();
  }

  public render() {
    let player = this.game.ownPlayer;
    if (player && player.position) {
      this.game.render(player.position.x.value, player.position.y.value, 16);
    }
  }

  public updateDirection(direction: number) {
    let player = this.game.ownPlayer;
    if (!player)
      return;

    this.sendUpdateDirection(
      direction,
      player.position.x.value,
      player.position.y.value
    );
  }

  public sendUpdateDirection(direction: number, x: number, y: number) {
    let packet = new UpdateDirectionPacket();
    packet.direction.value = direction;
    packet.position.x.value = x;
    packet.position.y.value = y;
    this.sendPacket(packet);

    let player = this.game.ownPlayer;
    if (player) {
      player.direction = direction;
      player.position.x.value = x;
      player.position.y.value = y;
      player.lastPositionUpdate = new Date();
    }

    // update local trail?
  }

  //
  // handlers
  //

  @handler
  protected handlePlayerDeath(packet: PlayerDeathPacket) {
    packet.player.value.die();
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
    // console.log(packet);
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

    player.move(player.direction, this.game.speed * this.averagePing / 2);
    player.lastPositionUpdate = new Date();
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

  @handler
  protected handleDeath(packet: YouDiedPacket) {
    this.disconnect();
  }
}
