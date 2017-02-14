import Connection from "./common/Connection";
import Player from "./common/Player";

function lookaheadSafety(connection: Connection, player: Player, maxLookahead = 8) {
  let position = player.position.clone();
  for (let lookahead = 0; lookahead < maxLookahead; ++lookahead) {
    if (connection.game.getBlock(position.x.value, position.y.value) === player.skin + 2)
      // safe
      return true;
    position.move(player.direction, 1);
  }

  return false;
}

let connection = new Connection({
  url: "ws://46.101.242.80:8002/splix",
  name: "Cheese"
});

interface QueueItem {
  delay: number;
  handler: Function;
}

connection.addListener("open", () => {
  let queue: QueueItem[] = [];

  setInterval(() => {
    connection.update();
    connection.render();

    console.log("update");

    // do queue

    let player = connection.game.ownPlayer;
    if (!player)
      return;

    if (lookaheadSafety(connection, player)) {
      queue = [];
      console.log(`safety ahead`);
      return;
    }

    console.log(`queue: ${queue.length}`);

    while (queue.length > 0) {
      let queuedItem = queue[0];
      
      if (queuedItem.delay <= 0) {
        queuedItem.handler();
        queue.shift();
      } else {
        --queuedItem.delay;
        return;
      }
    }

    // do idle thread

    console.log(`panic thread; ping ${connection.averagePing} ms`);

    if (Math.random() > 0.5) {
      queue.push({
        delay: 0,
        handler: () => {
          connection.updateDirection((player!.direction + 1) % 4);
        }
      });
    }

    queue.push({
      delay: 2,
      handler: () => {
        connection.updateDirection((player!.direction + 1) % 4);
      }
    });

    queue.push({
      delay: 4,
      handler: () => {
        connection.updateDirection((player!.direction + 1) % 4);
      }
    });

    queue.push({
      delay: 6,
      handler: () => {}
    });
  }, 160);
});

connection.addListener("close", () => {
  process.exit();
});
