import Player from "./Player";


const MAP_SIZE = 600;
const GLOBAL_SPEED = 0.006;

const colors = [
  16, // black

  160, // red
  166, // red2
  162, // pink
  164, // pink2
  90, // purple
  21, // blue
  32, // blue2
  76, // green
  64, // green2
  58, // leaf
  220, // yellow
  208, // orange
  226 // gold
];

export default class Game {
  blocks: Uint8Array;
  players: { [id: number]: Player } = {};

  lastUpdate: number = new Date().getTime();

  constructor() {
    this.blocks = new Uint8Array(MAP_SIZE * MAP_SIZE);
  }

  render(midX: number, midY: number, distance: number) {
    midX = Math.floor(midX);
    midY = Math.floor(midY);
    
    let viewport = new Uint8Array((2 * distance + 1) * (2 * distance + 1));

    for (let y = midY - distance; y <= midY + distance; ++y) {
      for (let x = midX - distance; x <= midX + distance; ++x) {
        let block = 0;

        if (x < 0 || y < 0 || x >= MAP_SIZE || y >= MAP_SIZE) {
          // out of bounds
          block = 255;
        } else {
          block = this.blocks[x + y * MAP_SIZE];
        }

        let xx = x - midX + distance;
        let yy = y - midY + distance;

        viewport[xx + yy * (distance * 2 + 1)] = block;
      }
    }

    function drawDot(x: number, y: number, skin: number) {
      x = Math.round(x);
      y = Math.round(y);

      if (Math.abs(x - midX) > distance || Math.abs(y - midY) > distance)
        return;

      let xx = x - midX + distance;
      let yy = y - midY + distance;

      viewport[xx + yy * (distance * 2 + 1)] = skin;
    }

    function drawLine(x0: number, y0: number, x1: number, y1: number, skin: number) {
      let length = Math.max(
        Math.abs(x1 - x0),
        Math.abs(y1 - y0)
      );

      for (let i = 0; i <= length; ++i) {
        let x = x0 + (x1 - x0) * i / length;
        let y = y0 + (y1 - y0) * i / length;

        drawDot(x, y, skin);
      }
    }

    Object.keys(this.players).forEach(key => {
      let player = this.players[<any>key];
      if (!player.position)
        return;
      
      [ ...player.trail, player.position ].reduce((a, b) => {
        drawLine(a.x.value, a.y.value, b.x.value, b.y.value, player.skin + 0x40);
        return b;
      });

      drawDot(player.position.x.value, player.position.y.value, player.skin + 0x80);
    });

    process.stdout.write("\x1b[0;0H");
    console.log(`render ${midX}, ${midY}`);

    for (let yy = 0; yy <= distance * 2; ++yy) {
      for (let xx = 0; xx <= distance * 2; ++xx) {
        let block = viewport[xx + yy * (distance * 2 + 1)];
        let char = " ";
        let color = 0;

        if (block === 255)
          char = "#";
        else if (block <= 1)
          char = " ";
        else {
          if (block >= 0x80)
            char = "*";
          else if (block >= 0x40)
            char = "+";
          else
            char = "o";
          
          color = (color & 0x3F) - 2;

          if (color <= 0)
            color = 1;
        }

        process.stdout.write(`\x1b[48;5;${colors[color]}m${char}${char}`);
      }
      
      process.stdout.write("\x1b[0m\n");
    }

    process.stdout.write("\n");
  }

  getBlock(x: number, y: number) {
    return this.blocks[x + y * MAP_SIZE];
  }

  getPlayer(id: number) {
    if (!this.players.hasOwnProperty(String(id)))
      this.players[id] = new Player(id);
    return this.players[id];
  }

  removePlayer(player: Player) {
    delete this.players[player.id];
  }

  fillArea(
    startX: number, startY: number,
    width: number, height: number,
    color: number, pattern: number
  ) {
    let endX = startX + width;
    let endY = startY + height;

    for (let x = startX; x < endX; ++x) {
      for (let y = startY; y < endY; ++y) {
        this.blocks[x + y * MAP_SIZE] = color;
      }
    }

    console.log(`fill ${startX}, ${startY}; ${width}, ${height}; with ${color}`);
  }

  setChunkOfBlocks(
    startX: number, startY: number,
    width: number, height: number,
    data: number[]
  ) {
    let endX = startX + width;
    let endY = startY + height;

    for (let i = 0, x = startX; x < endX; ++x) {
      for (let y = startY; y < endY; ++y) {
        this.blocks[x + y * MAP_SIZE] = data[i++];
      }
    }

    console.log(`chunk ${startX}, ${startY}; ${width}, ${height}`);
  }

  loop() {
    let timestamp = new Date().getTime();
    let deltaTime = timestamp - this.lastUpdate;

    Object.keys(this.players).forEach(key => {
      let player = this.players[<any>key];
      player.move(player.direction, deltaTime * GLOBAL_SPEED);
    })

    this.lastUpdate = timestamp;

    //
    // render
    //

    if (this.players.hasOwnProperty("0") && this.players[0].position) {
      let pos = this.players[0].position;
      this.render(pos.x.value, pos.y.value, 8);
    }
  }
}
