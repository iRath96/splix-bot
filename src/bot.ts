import Connection from "./common/Connection";
import Player from "./common/Player";
import Vector from "./common/Vector";


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
  url: "ws://178.62.247.232:8002/splix",
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
  let preReturnVector: Vector;

  setInterval(() => {
    connection.update();
    connection.render();

    console.log(`update (${BotState[state]}); ping ${Math.round(connection.averagePing)} ms`);

    // do queue

    let player = connection.game.ownPlayer;
    if (!player)
      return;
    
    let distanceToOthers: number;

    let onSafe = lookaheadSafety(connection, player, 0);
    if (onSafe) {
      // we're safe, so don't use trail distance
      distanceToOthers = Math.floor(connection.game.distanceToOthers);
    } else {
      // use trail distance
      distanceToOthers = Math.floor(connection.game.getEstimatedTrailDistanceToOthers());
    }

    // others might have send direction updates that we are not aware of yet
    // this might reduce their distance to us, which is why we need to compensate for this
    distanceToOthers = Math.max(0, distanceToOthers - 3);

    console.log(`distance to others: ${distanceToOthers} (rd: ${returnDistance})`);

    let unsafeAhead = lookaheadUnsafety(connection, player, 4);

    if (!unsafeAhead) {
      state = BotState.SAFE;
      console.log(`safe mode`);
      
      if (Math.random() > 0.95)
        connection.updateDirection((player!.direction + 3) % 4);
      
      return;
    }

    if (onSafe && unsafeAhead && distanceToOthers <= 8) {
      console.log(`unsafe edge, trying to turn`);
      connection.updateDirection((player!.direction + 1) % 4);
      return;
    }

    if (lookaheadSafety(connection, player, Math.max(0, distanceToOthers - 2))) {
      state = BotState.SAFE;
      console.log(`safety ahead`);

      if (returnDistance > 0)
        --returnDistance;

      return;
    }

    if (state === BotState.PRE_RETURN) {
      console.log(`doing turn`);

      preReturnVector.x = Math.round(preReturnVector.x);
      preReturnVector.y = Math.round(preReturnVector.y);
      preReturnVector.move(player.direction, 1);
      player.position = preReturnVector;

      connection.updateDirection((player!.direction + 1) % 4);
      state = BotState.RETURNING;

      return;
    }

    if (
      state === BotState.ADVANCING &&
      returnDistance >= distanceToOthers - 5
    ) {
      console.log(`returning`);

      connection.updateDirection((player!.direction + 1) % 4);
      state = BotState.PRE_RETURN;
      preReturnVector = player.position.clone();

      return;
    }

    if (state === BotState.RETURNING) {
      console.log(`returning`);
      --returnDistance;
      return;
    }

    if (state === BotState.ADVANCING) {
      ++returnDistance;
      return;
    }

    let onUnsafe = lookaheadUnsafety(connection, player, 0);
    if (state === BotState.SAFE && onUnsafe) {
      // was safe, now isn't anymore

      state = BotState.ADVANCING;

      // compensate for
      // 1. the direction update (which takes two cycles)
      // 2. network latency
      // 3. a third turn we might do (if there is no safe block adjacent to this one)
      // 4. a shorter trail distance because our parallel trail might bring us closer to others

      returnDistance = 3;

      return;
    }

    console.log(`idle state`);
  }, 167);
});

connection.addListener("death", () => {
  console.log("dammit");
});

connection.addListener("close", () => {
  process.exit();
});
