import Connection from "./common/Connection";
import Player from "./common/Player";

function lookaheadUnsafety(connection: Connection, player: Player, maxLookahead = 8) {
  let position = player.position.clone();
  for (let lookahead = 0; lookahead <= maxLookahead; ++lookahead) {
    if (connection.game.getBlock(position.x, position.y) !== player.skin + 2)
      // safe
      return true;
    position.move(player.direction, 1);
  }

  return false;
}

function lookaheadSafety(connection: Connection, player: Player, maxLookahead = 8) {
  let position = player.position.clone();
  for (let lookahead = 0; lookahead <= maxLookahead; ++lookahead) {
    if (connection.game.getBlock(position.x, position.y) === player.skin + 2)
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

enum BotState {
  SAFE = 0,
  ADVANCING = 1,
  PRE_RETURN = 2,
  RETURNING = 3
}

connection.addListener("open", () => {
  let returnDistance = 0;

  let state = BotState.SAFE;

  setInterval(() => {
    connection.update();
    connection.render();

    console.log(`update (${BotState[state]}); ping ${Math.round(connection.averagePing)} ms`);

    // do queue

    let player = connection.game.ownPlayer;
    if (!player)
      return;
    
    let distanceToOthers = Math.floor(connection.game.getEstimatedTrailDistanceToOthers());
    console.log(`distance to others: ${distanceToOthers} (rd: ${returnDistance})`);

    let unsafeAhead = lookaheadUnsafety(connection, player, 4);

    if (!unsafeAhead) {
      state = BotState.SAFE;
      console.log(`safe mode`);
      
      if (Math.random() > 0.95)
        connection.updateDirection((player!.direction + 3) % 4);
      
      return;
    }

    let onSafe = lookaheadSafety(connection, player, 0);
    if (onSafe && unsafeAhead && distanceToOthers <= 4) {
      console.log(`unsafe edge, trying to turn`);
      connection.updateDirection((player!.direction + 1) % 4);
      return;
    }

    if (lookaheadSafety(connection, player, Math.floor(distanceToOthers * 0.9))) {
      state = BotState.SAFE;
      console.log(`safety ahead`);

      if (returnDistance > 0)
        --returnDistance;

      return;
    }

    if (state === BotState.PRE_RETURN) {
      console.log(`doing turn`);

      connection.updateDirection((player!.direction + 1) % 4);
      state = BotState.RETURNING;

      return;
    }

    if (
      state === BotState.ADVANCING &&
      returnDistance > distanceToOthers - 8
    ) {
      console.log(`returning`);

      connection.updateDirection((player!.direction + 1) % 4);
      state = BotState.PRE_RETURN;

      return;
    }

    if (state === BotState.RETURNING) {
      console.log(`returning`);
      --returnDistance;
      return;
    }

    console.log(`unsafe state`);

    if (state === BotState.SAFE) {
      // was safe, now isn't anymore

      state = BotState.ADVANCING;
      returnDistance = 0;
    }

    ++returnDistance;
  }, 167);
});

connection.addListener("death", () => {
  console.log("dammit");
});

connection.addListener("close", () => {
  process.exit();
});
