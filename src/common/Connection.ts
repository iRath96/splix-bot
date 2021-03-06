import * as WebSocket from "ws";
import { EventEmitter } from "events";

import PlayerHandle from "../packets/mixins/PlayerHandle";

import Game from "./Game";
import Vector from "./Vector";

import { Packet } from "../packets/common/Packet";
import Scope from "../packets/Scope";

import PlayerDeathPacket from "../packets/server/PlayerDeath";
import FillAreaPacket from "../packets/server/FillArea";
import ChunkOfBlocksPacket from "../packets/server/ChunkOfBlocks";
import SetTrailPacket from "../packets/server/SetTrail";
import EmptyTrailPacket from "../packets/server/EmptyTrail";
import PongPacket from "../packets/server/Pong";
import RemovePlayerPacket from "../packets/server/RemovePlayer";
import ServerReadyPacket from "../packets/server/Ready";
import PlayerPositionPacket from "../packets/server/PlayerPosition";
import PlayerNamePacket from "../packets/server/PlayerName";
import PlayerSkinPacket from "../packets/server/PlayerSkin";
import MyScorePacket from "../packets/server/MyScore";
import MyRankPacket from "../packets/server/MyRank";
import LeaderboardPacket from "../packets/server/Leaderboard";
import MapSizePacket from "../packets/server/MapSize";
import MinimapPacket from "../packets/server/Minimap";
import YouDiedPacket from "../packets/server/YouDied";

import PingPacket from "../packets/client/Ping";
import VersionPacket from "../packets/client/Version";
import SetUsernamePacket from "../packets/client/SetUsername";
import SkinPacket from "../packets/client/Skin";
import RequestMyTrailPacket from "../packets/client/RequestMyTrail";
import ReadyPacket from "../packets/client/Ready";
import UpdateDirectionPacket from "../packets/client/UpdateDirection";


const handler: PropertyDecorator = function (target: { constructor: typeof Connection }, property: string) {
  let types = Reflect.getMetadata("design:paramtypes", target, property);

  target.constructor.handlers.push([
    <typeof Packet>types[0],
    property
  ]);
};

const PING_BUFFER_COUNT = 5;
const PING_INTERVAL = 2000; /* ms */

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
    try {
      this.socket!.send(new Uint8Array(packet.serialize()));
    } catch (e) {
      console.error(e);
      this.disconnect();
    }
  }

  protected recvPacket(raw: number[]) {
    let packet = Packet.deserialize(Scope.SERVER, raw);
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
    
    this.socket.on("open", () => {
      this.handleConnected();
    });

    this.socket.on("message", msg => {
      let uData = new Uint8Array(msg);
      let data = (<any>Array).from(uData);

      try {
        this.recvPacket(data);
      } catch (e) {
        // console.log("Failed to parse packet", uData);
        // console.error(e);
      }
    });

    this.socket.on("error", err => {
      this.disconnect();
    });
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

  disconnect() {
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

  on(event: "leaderboard", callback: (packet: LeaderboardPacket) => any): void;
  on(event: string, callback: Function): any;
  
  on(event: string, callback: Function): any {
    return super.on(event, callback);
  }

  public update() {
    this.game.loop();
  }

  public render() {
    let player = this.game.ownPlayer;
    if (player && player.position) {
      this.game.render(player.position.x, player.position.y, 16);
    }
  }

  public updateDirection(direction: number) {
    let player = this.game.ownPlayer;
    if (!player)
      return;

    this.sendUpdateDirection(
      direction,
      Math.round(player.position.x),
      Math.round(player.position.y)
    );
  }

  public sendUpdateDirection(direction: number, x: number, y: number) {
    let packet = new UpdateDirectionPacket();
    packet.direction.value = direction;
    packet.position.value = new Vector(x, y);
    this.sendPacket(packet);

    let player = this.game.ownPlayer;
    if (player) {
      player.direction = direction;
      player.position.x = x;
      player.position.y = y;
      player.lastPositionUpdate = new Date();
    }
  }

  //
  // handlers
  //

  protected getPlayer(handle: PlayerHandle) {
    return this.game.getPlayer(handle.value);
  }

  @handler
  protected handlePlayerDeath(packet: PlayerDeathPacket) {
    this.getPlayer(packet.player).die();
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
    this.getPlayer(packet.player).trail = packet.trail.map(p => p.value);
  }

  @handler
  protected handleReady(packet: ServerReadyPacket) {
    // console.log(packet);
  }

  @handler
  protected handleEmptyTrail(packet: EmptyTrailPacket) {
    this.getPlayer(packet.player).trail = [];
    if (packet.lastPosition !== null)
      this.getPlayer(packet.player).position = packet.lastPosition.value;
  }

  @handler
  protected handleRemovePlayer(packet: RemovePlayerPacket) {
    this.game.removePlayer(this.getPlayer(packet.player));
  }

  @handler
  protected handlePlayerPosition(packet: PlayerPositionPacket) {
    let player = this.getPlayer(packet.player);
    player.position = packet.position.value;
    player.direction = packet.direction.value;
    
    // the official client doesn't seem to do this,
    // but we it nonetheless :)
    if (player.trail.length > 0)
      player.trail.push(player.position.clone());

    player.move(player.direction, this.game.speed * this.averagePing / 2);
    player.lastPositionUpdate = new Date();
  }

  @handler
  protected handlePlayerName(packet: PlayerNamePacket) {
    this.getPlayer(packet.player).name = packet.name.value;
  }

  @handler
  protected handlePlayerSkin(packet: PlayerSkinPacket) {
    this.getPlayer(packet.player).skin = packet.skin.value;
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
    this.emit("leaderboard", packet);
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
    this.emit("death");
    this.disconnect();
  }
}
