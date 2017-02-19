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
import FillAreaPacket from "./packets/server/FillArea";
import RemovePlayerPacket from "./packets/server/RemovePlayer";

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

  updatePosition() {
    let now = new Date();
    let deltaTime = now.getTime() - this.lastPositionUpdate.getTime();

    this.position.move(this.direction, GLOBAL_SPEED * deltaTime);
    this.lastPositionUpdate = now;
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
    console.log("start-trail");
    this.trail.push(this.position.clone());

    this.trailChunks.clear();
    this.trailChunks.add(this.chunk);
  }

  endTrail() {
    console.log("end-trail");
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
    this.chunk.neighbors.forEach(chunk => {
      if (this.knownChunks.has(chunk))
        return;
      
      // the chunk is new to the player, send it to the player
      console.log(`Sending chunk ${chunk.x},${chunk.y} to user`);
      this.sendChunk(chunk);
    });

    this.knownChunks.forEach(chunk => {
      if (this.chunk.neighbors.has(chunk))
        return;
      
      // the player cannot see this chunk anymore, forget about it
      this.knownChunks.delete(chunk);
    });
  }
  
  sendChunk(chunk: Chunk) {
    this.sendPacket(
      new ChunkOfBlocksPacket(
        chunk.x * CHUNK_SIZE,
        chunk.y * CHUNK_SIZE,
        CHUNK_SIZE,
        CHUNK_SIZE,
        chunk.colors
      )
    );

    this.knownChunks.add(chunk);
  }

  canSeeChunk(chunk: Chunk) {
    return this.chunk.neighbors.has(chunk);
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
          new PlayerSkinPacket(other.idFor(this), other.color) // @todo Is this correct?
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

  removeOtherPlayer(other: Player) {
    this.knownPlayers.delete(other);
    this.sendPacket(
      new RemovePlayerPacket(other.id)
    );
  }

  get isOutside() {
    return this.chunk.playerIdAt(
      this.position.x,
      this.position.y
    ) !== this.id;
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

  get colors() {
    return [ ...this.playerIds.values() ].map(playerId =>
      playerId < 2 ? playerId : this.game.players.get(playerId)!.color + 2
    );
  }

  getChunkDistance(other: Chunk) {
    return Math.max(Math.abs(other.x - this.x), Math.abs(other.y - this.y));
  }

  constructor(
    public readonly game: Game,
    public readonly id: TChunkId
  ) {
    for (let i = 0; i < this.playerIds.length; ++i)
      this.playerIds[i] = 1;
  }

  fillArea(player: Player, x: number, y: number, width: number, height: number) {
    // console.log(`fillArea ${x},${y};${width},${height}`);
    for (let xx = x; xx < x + width; ++xx)
      for (let yy = y; yy < y + height; ++yy)
        this.playerIds[yy + xx * CHUNK_SIZE] = player.id;
  }

  removePlayer(player: Player) {
    let wasUpdated = false;
    for (let i = 0; i < this.playerIds.length; ++i)
      if (this.playerIds[i] === player.id) {
        this.playerIds[i] = 1;
        wasUpdated = true;
      }
    
    return wasUpdated;
  }

  playerIdAt(x: number, y: number) {
    return this.playerIds[Math.floor(y) % CHUNK_SIZE + (Math.floor(x) % CHUNK_SIZE) * CHUNK_SIZE];
  }
}

const GLOBAL_SPEED = 0.006;
class Game {
  players = new Map<TPlayerId, Player>();
  chunks = new Map<TChunkId, Chunk>();

  idCounter: TPlayerId = 2;
  freeIds = new Set<TPlayerId>();

  constructor() {
    for (let i = 0, j = CHUNKS_PER_DIMENSION * CHUNKS_PER_DIMENSION; i < j; ++i)
      this.chunks.set(i, new Chunk(this, i));
    
    // set neighbors for chunks

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

  fillArea(player: Player, x: number, y: number, width: number, height: number) {
    // console.log(`large fillArea: ${x},${y};${width},${height}`);
    let cxMin = Math.floor(x / CHUNK_SIZE);
    let cxMax = Math.floor((x + width - 1) / CHUNK_SIZE);
    let cyMin = Math.floor(y / CHUNK_SIZE);
    let cyMax = Math.floor((y + height - 1) / CHUNK_SIZE);

    let players = new Set<Player>();

    for (let cx = cxMin; cx <= cxMax; ++cx)
      for (let cy = cyMin; cy <= cyMax; ++cy) {
        let chunk = this.chunks.get(cx + cy * CHUNKS_PER_DIMENSION)!;
        this.players.forEach(player => {
          if (player.canSeeChunk(chunk))
            players.add(player);
        });

        let lx = Math.max(x - cx * CHUNK_SIZE, 0);
        let ly = Math.max(y - cy * CHUNK_SIZE, 0);

        chunk.fillArea(
          player,
          lx,
          ly,
          Math.min(x + width - cx * CHUNK_SIZE, CHUNK_SIZE) - lx,
          Math.min(y + height - cy * CHUNK_SIZE, CHUNK_SIZE) - ly
        );
      }
    
    players.forEach(player =>
      player.sendPacket(
        new FillAreaPacket(x, y, width, height, player.color + 2, player.pattern)
      )
    );

    players.forEach(player => {
      console.log(player.username);
    });
  }

  protected createPlayerId() {
    if (this.freeIds.size > 0) {
      let id = this.freeIds.values().next().value;
      this.freeIds.delete(id);
      return id;
    }

    return this.idCounter++;
  }

  addPlayer(player: Player) {
    player.id = this.createPlayerId();
    this.players.set(player.id, player);
  }

  protected freePlayerId(id: TPlayerId) {
    this.freeIds.add(id);
  }

  removePlayer(player: Player) {
    // remove from game
    this.players.delete(player.id);
    this.freePlayerId(player.id);

    // remove from other players
    this.players.forEach(other => {
      if (other.knowsOtherPlayer(player))
        other.removeOtherPlayer(player);
    });

    // remove from all chunks
    this.chunks.forEach(chunk => {
      if (chunk.removePlayer(player))
        // chunk was updated
        this.players.forEach(other => {
          if (other.canSeeChunk(chunk))
            other.sendChunk(chunk);
        });
    });
  }

  chunkForPosition(x: number, y: number) {
    let id = Math.floor(x / CHUNK_SIZE) + Math.floor(y / CHUNK_SIZE) * CHUNKS_PER_DIMENSION;
    return this.chunks.get(id)!;
  }

  loop() {
    this.players.forEach(player => {
      // update player position
      player.updatePosition();
      player.setChunk(this.chunkForPosition(player.position.x, player.position.y));

      // trail management
      let hasTrail = player.hasTrail;
      let isOutside = player.isOutside;

      if (hasTrail !== isOutside) {
        if (hasTrail) {
          console.log(`@todo fill-area`);
          player.endTrail();
        } else
          player.startTrail();
        
        this.players.forEach(other =>
          other.sendPlayerUpdate(other)
        );
      }
    });

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
        console.log(`Removing player ${player.username}`);
        this.game.removePlayer(player);
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

    if (player.color === 0)
      player.color = Math.floor(Math.random() * 10); // @todo
  }

  @handler
  protected handleReady(player: Player, packet: ReadyPacket) {
    if (player.state === PlayerState.NEW) {
      // allocate area for player and send FillPacket
      player.position = new Vector(Math.floor(300 + Math.random() * 20), 300);
      player.lastPositionUpdate = new Date();
      player.setChunk(this.game.chunkForPosition(player.position.x, player.position.y));

      // send chunks of surrounding blocks
      player.sendChunkUpdates();

      // update state
      player.state = PlayerState.READY;

      // add to game
      this.game.addPlayer(player);
      this.game.fillArea(player, player.position.x - 2, player.position.y - 2, 5, 5);
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
    try {
      player.updatePosition();

      if (packet.direction.value < 0 || packet.direction.value > 3)
        throw new Error("Invalid direction");

      let distanceSinceTurn = player.position.distanceInDirection(packet.position.value, player.direction);
      console.log(distanceSinceTurn);
      if (distanceSinceTurn < -2)
        throw new Error("Turn in the future");
      
      if (distanceSinceTurn > 2)
        throw new Error("Turn to long ago");
      
      // update direction
      player.position.move(player.direction, -distanceSinceTurn);
      player.setDirection(packet.direction.value);
      player.position.move(player.direction, distanceSinceTurn);

      console.log(`Turn accepted`);

      // notify players about the direction update / trail update
      this.game.players.forEach(other => {
        other.sendPlayerUpdate(player);
      });
    } catch (e) {
      // turn was not accepted, send player update
      console.log(`Turn not accepted`);
      player.sendPlayerUpdate(player);
    }
  }
}

new Server({ port: 8001 });
