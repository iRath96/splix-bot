import * as WebSocket from "ws";
import { EventEmitter } from "events";

import Game from "./common/Game";
import Vector from "./common/Vector";

import { Packet } from "./packets/common/Packet";
import Scope from "./packets/Scope";

import PongPacket from "./packets/server/Pong";
import ChunkOfBlocksPacket from "./packets/server/ChunkOfBlocks";
import PlayerPositionPacket from "./packets/server/PlayerPosition";
import PlayerNamePacket from "./packets/server/PlayerName";
import PlayerSkinPacket from "./packets/server/PlayerSkin";
import SetTrailPacket from "./packets/server/SetTrail";
import ServerReadyPacket from "./packets/server/Ready";

import PingPacket from "./packets/client/Ping";
import VersionPacket from "./packets/client/Version";
import SetUsernamePacket from "./packets/client/SetUsername";
import SkinPacket from "./packets/client/Skin";
import RequestMyTrailPacket from "./packets/client/RequestMyTrail";
import ReadyPacket from "./packets/client/Ready";
import UpdateDirectionPacket from "./packets/client/UpdateDirection";


const handler: PropertyDecorator = function (target: { constructor: typeof Server }, property: string) {
  let types = Reflect.getMetadata("design:paramtypes", target, property);

  target.constructor.handlers.push([
    <typeof Packet>types[1],
    property
  ]);
};

enum PlayerState {
  NEW = 0,
  READY = 1,
  PLAYING = 2
}

class Player {
  public username: string = "";
  public color: number = 0;
  public pattern: number = 0;
  public trail: Vector[] = [];

  public version: number;

  public position: Vector;

  public state: PlayerState = PlayerState.NEW;

  constructor(
    public readonly socket: WebSocket
  ) {
  }

  sendPacket(packet: Packet) {
    try {
      this.socket.send(new Uint8Array(packet.serialize()));
    } catch (e) {
      console.error(e);
    }
  }
}

export class Server extends EventEmitter {
  [key: string]: any;

  public wss: WebSocket.Server;
  public players: Player[] = [];

  public readonly game: Game = new Game();
  static handlers: [ typeof Packet, string ][] = [];

  constructor(
    public options: WebSocket.IServerOptions
  ) {
    super();

    this.wss = new WebSocket.Server(options);
    this.wss.on("connection", this.handleClient.bind(this));
  }

  protected handleClient(client: WebSocket) {
    let player = new Player(client);
    this.players.push(player);

    client.on("message", msg => {
      let uData = new Uint8Array(msg);
      let data = (<any>Array).from(uData);

      try {
        this.recvPacket(player, data);
      } catch (e) {
        // console.log("Failed to parse packet", uData);
        // console.error(e);
      }
    });

    client.on("close", () => {
      this.players = this.players.filter(p => p !== player);
    });
  }

  protected recvPacket(player: Player, raw: number[]) {
    let packet = Packet.deserialize(Scope.CLIENT, raw);
    this.handlePacket(player, packet);
  }

  protected handlePacket(player: Player, packet: Packet) {
    let handler = (<any>Server.handlers).find((handler: any) =>
      handler[0] === packet.class
    );
    
    if (handler === undefined)
      throw new Error(`No handler for packet-id ${packet.class.packetId}`);

    this[handler![1]](player, packet);
  }

  //
  // handlers
  //

  @handler
  protected handlePing(player: Player, packet: PingPacket) {
    player.sendPacket(new PongPacket());
  }

  @handler
  protected handleVersion(player: Player, packet: VersionPacket) {
    player.version = packet.version.value;
  }

  @handler
  protected handleUsername(player: Player, packet: SetUsernamePacket) {
    player.username = packet.username.value;
    console.log(`Got player ${player.username}`);
  }

  @handler
  protected handleSkin(player: Player, packet: SkinPacket) {
    player.color = packet.color.value;
    player.pattern = packet.pattern.value;
  }

  @handler
  protected handleReady(player: Player, packet: ReadyPacket) {
    if (player.state === PlayerState.NEW) {
      // 1. allocate area for player and send FillPacket
      // @todo

      // 2. send chunk of surrounding blocks
      let chunkPacket = new ChunkOfBlocksPacket();
      chunkPacket.x.value = 0;
      chunkPacket.y.value = 0;
      chunkPacket.width.value = 51;
      chunkPacket.height.value = 51;

      for (let x = 0; x < 51; ++x)
        for (let y = 0; y < 51; ++y)
          chunkPacket.data[x + y * 51] = Math.floor(Math.random() * 10);

      player.sendPacket(chunkPacket);

      // update state
      player.state = PlayerState.READY;
    } else if (player.state === PlayerState.READY) {
      // 1. send position of player
      player.sendPacket(
        new PlayerPositionPacket(0, new Vector(25, 25), 0)
      );

      // 2. send name of player
      player.sendPacket(
        new PlayerNamePacket(0, player.username)
      );

      // 3. send skin of player
      player.sendPacket(
        new PlayerSkinPacket(0, player.pattern) // @todo Is this correct?
      );

      // 4. send ready
      player.sendPacket(
        new ServerReadyPacket()
      );

      // update state
      player.state = PlayerState.PLAYING;
    }
  }

  @handler
  protected handleTrailRequest(player: Player, packet: RequestMyTrailPacket) {
    player.sendPacket(
      new SetTrailPacket(0, player.trail)
    );
  }

  @handler
  protected handleDirectionUpdate(player: Player, packet: UpdateDirectionPacket) {
    // @todo
    console.log(`Direction update`);
  }
}

new Server({ port: 8001 });
