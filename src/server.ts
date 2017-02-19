import * as WebSocket from "ws";
import { EventEmitter } from "events";

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


/**
 * @todo
 * Direction updates can cause player positions to jump slightly.
 * This can cause trail-start detection or trail-chunk registration to behave oddly.
 */

enum PlayerState {
  NEW = 0,
  READY = 1,
  PLAYING = 2
}

type TChunkId = number;
type TChunkVersion = number;

type TPlayerId = number;
class Player {
  public id: TPlayerId;

  public username: string = "";
  public color: number = 0;
  public pattern: number = 0;
  public trail: Vector[] = [];

  public version: number;

  public position: Vector;
  public lastPositionUpdate: Date;
  public direction: number = 0;

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
  
  idFor(player: Player) {
    if (this === player)
      return 0;
    return player.id;
  }

  //
  // trail management
  //

  public readonly trailChunks = new Set<Chunk>();

  get hasTrail() {
    return this.trail.length > 0;
  }

  startTrail() {
    this.trail.push(this.position.clone());

    this.trailChunks.clear();
    this.trailChunks.add(this.chunk);
  }

  endTrail() {
    this.trail = [];
  }

  setDirection(direction: number) {
    this.direction = direction;
    if (this.hasTrail)
      this.trail.push(this.position.clone());
  }

  //
  // chunk management
  //

  protected chunk: Chunk;
  setChunk(newChunk: Chunk) {
    if (this.chunk === newChunk)
      return;
    
    if (this.hasTrail)
      this.trailChunks.add(newChunk);
    
    this.chunk = newChunk;
  }

  protected readonly knownChunks = new Set<Chunk>();
  sendChunkUpdates() {
    console.log(`User in chunk ${this.chunk.x},${this.chunk.y}`);
    console.log(`User at pos ${this.position.x},${this.position.y}`);

    this.chunk.neighbors.forEach(chunk => {
      if (this.knownChunks.has(chunk))
        return;
      
      // the chunk is new to the player, send it to the player
      console.log(`Sending chunk ${chunk.x},${chunk.y} to user`);
      this.sendPacket(
        new ChunkOfBlocksPacket(
          chunk.x * CHUNK_SIZE,
          chunk.y * CHUNK_SIZE,
          CHUNK_SIZE,
          CHUNK_SIZE,
          [ ...chunk.playerIds.values() ]
        )
      );
      this.knownChunks.add(chunk);
    });

    this.knownChunks.forEach(chunk => {
      if (this.chunk.neighbors.has(chunk))
        return;
      
      // the player cannot see this chunk anymore, forget about it
      this.knownChunks.delete(chunk);
    });
  }

  protected readonly knownPlayers = new Set<Player>();
  sendPlayerUpdate(other: Player) {
    let canSeeOtherPlayer = this.canSeeOtherPlayer(other);
    let knowsOtherPlayer = this.knowsOtherPlayer(other);

    if (knowsOtherPlayer && !canSeeOtherPlayer) {
      // forget about the player
      console.log(`@todo forget-player`);
      this.knownPlayers.delete(other);
    } else if (canSeeOtherPlayer) {
      if (!knowsOtherPlayer) {
        // introduce other player
        this.sendPacket(
          new PlayerNamePacket(other.idFor(this), other.username)
        );

        this.sendPacket(
          new PlayerSkinPacket(other.idFor(this), other.pattern) // @todo Is this correct?
        );

        this.knownPlayers.add(other);
      }

      this.sendPacket(
        new PlayerPositionPacket(other.idFor(this), other.position, other.direction)
      );

      this.sendPacket(
        new SetTrailPacket(other.idFor(this), other.trail)
      );
    }
  }

  canSeeOtherPlayer(other: Player) {
    if (other.hasTrail)
      return ![ ...other.trailChunks ].every(chunk =>
        // if any trailChunk is one of our neighbors, we can see this player
        !this.chunk.neighbors.has(chunk)
      );
    
    return this.chunk.neighbors.has(other.chunk);
  }

  knowsOtherPlayer(other: Player) {
    return this.knownPlayers.has(other);
  }
}

const MAP_SIZE = 600;
const CHUNK_SIZE = 12;
const CHUNKS_PER_DIMENSION = MAP_SIZE / CHUNK_SIZE;
const NEIGHBOR_DISTANCE = 2;

class Chunk {
  public playerIds = new Uint16Array(CHUNK_SIZE * CHUNK_SIZE);
  public version: TChunkVersion = 0;

  public readonly neighbors = new Set<Chunk>();

  get x() { return this.id % CHUNKS_PER_DIMENSION; }
  get y() { return ~~(this.id / CHUNKS_PER_DIMENSION); }

  getChunkDistance(other: Chunk) {
    return Math.max(Math.abs(other.x - this.x), Math.abs(other.y - this.y));
  }

  constructor(
    public readonly id: TChunkId
  ) {
    for (let i = 0; i < this.playerIds.length; ++i)
      this.playerIds[i] = Math.floor(Math.random() * 10);
  }
}

const GLOBAL_SPEED = 0.006;
class Game {
  players: Player[] = [];
  chunks: Chunk[] = [];

  idCounter: TPlayerId = 0;
  freeIds = new Set<TPlayerId>();

  constructor() {
    for (let i = 0, j = CHUNKS_PER_DIMENSION * CHUNKS_PER_DIMENSION; i < j; ++i)
      this.chunks.push(new Chunk(i));
    
    this.chunks.forEach(chunk => {
      this.chunks.forEach(other => {
        if (other.id < chunk.id)
          // we tested this already
          return;
        
        if (chunk.getChunkDistance(other) <= NEIGHBOR_DISTANCE) {
          // chunks are in proximity, connect them
          chunk.neighbors.add(other);
          other.neighbors.add(chunk);
        }
      });
    });
  }

  createPlayerId() {
    if (this.freeIds.size > 0) {
      let id = this.freeIds.values().next().value;
      this.freeIds.delete(id);
      return id;
    }

    return ++this.idCounter;
  }

  freePlayerId(id: TPlayerId) {
    this.freeIds.add(id);
  }

  chunkForPosition(x: number, y: number) {
    let id = ~~(x / CHUNK_SIZE) + ~~(y / CHUNK_SIZE) * CHUNKS_PER_DIMENSION;
    return this.chunks[id];
  }

  loop() {
    let now = new Date();
    this.players.forEach(player => {
      // update player position
      let deltaTime = now.getTime() - player.lastPositionUpdate.getTime();
      player.position.move(player.direction, deltaTime * GLOBAL_SPEED);
      player.lastPositionUpdate = now;

      console.log(`${player.position.x}, ${player.position.y}`);
      player.setChunk(this.chunkForPosition(player.position.x, player.position.y));
    });

    // @todo Fill area / kill players

    this.players.forEach(player => {
      player.sendChunkUpdates();

      // send player updates
      this.players.forEach(other => {
        if (player.canSeeOtherPlayer(other) !== player.knowsOtherPlayer(other))
          player.sendPlayerUpdate(other);
      });
    });
  }
}

const handler: PropertyDecorator = function (target: { constructor: typeof Server }, property: string) {
  let types = Reflect.getMetadata("design:paramtypes", target, property);

  target.constructor.handlers.push([
    <typeof Packet>types[1],
    property
  ]);
};

export class Server extends EventEmitter {
  [key: string]: any;

  public wss: WebSocket.Server;

  public readonly game: Game = new Game();
  static handlers: [ typeof Packet, string ][] = [];

  constructor(
    public options: WebSocket.IServerOptions
  ) {
    super();

    this.wss = new WebSocket.Server(options);
    this.wss.on("connection", this.handleClient.bind(this));

    setInterval(() => {
      this.game.loop();
    }, 167);
  }

  protected handleClient(client: WebSocket) {
    let player = new Player(client);
    
    client.on("message", msg => {
      let uData = new Uint8Array(msg);
      let data = (<any>Array).from(uData);

      try {
        this.recvPacket(player, data);
      } catch (e) {
        console.log("Failed to parse packet", uData);
        console.error(e);
      }
    });

    client.on("close", () => {
      if (player.id !== undefined) {
        // @todo
        this.game.players = this.game.players.filter(p => p !== player);
        this.game.freePlayerId(player.id);
      }
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
      player.position = new Vector(300, 300);
      player.lastPositionUpdate = new Date();
      player.setChunk(this.game.chunkForPosition(player.position.x, player.position.y));

      // 2. send chunks of surrounding blocks
      player.sendChunkUpdates();

      // update state
      player.state = PlayerState.READY;

      // add to game
      player.id = this.game.createPlayerId();
      this.game.players.push(player);
    } else if (player.state === PlayerState.READY) {
      player.sendPlayerUpdate(player);
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
    if (packet.direction.value < 0 || packet.direction.value > 3)
      throw new Error("Invalid direction");

    let distanceSinceTurn = player.position.distanceInDirection(packet.position.value, player.direction);
    if (distanceSinceTurn < 0)
      throw new Error("Turn in the future");
    
    if (distanceSinceTurn > 1)
      throw new Error("Turn to long ago");
    
    // update direction
    player.position.move(player.direction, -distanceSinceTurn);
    player.setDirection(packet.direction.value);
    player.position.move(player.direction, distanceSinceTurn);

    console.log(`Turn accepted`);

    // notify players about the direction update
    this.game.players.forEach(other => {
      other.sendPlayerUpdate(player);
    });
  }
}

new Server({ port: 8001 });
