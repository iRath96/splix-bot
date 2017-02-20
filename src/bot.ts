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
  url: "ws://104.131.86.130:8002/splix",
  name: "Cheese"
});

enum BotState {
  SAFE = 0,
  ADVANCING = 1,
  PRE_RETURN = 2,
  RETURNING = 3,
  POST_RETURN = 4,
  SAFE_RETURN = 5
}

connection.addListener("open", () => {
  let returnDistance = 0;

  let state = BotState.SAFE;
  let preReturnVector: Vector;
  let lastSafePosition: Vector;

  let turnDirection: number = 1;

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

    if (onSafe) {
      lastSafePosition = player.position.clone();

      state = BotState.SAFE;
      console.log(`safe mode`);

      if (!unsafeAhead) {
        if (Math.random() > 0.95)
          connection.updateDirection((player!.direction + 4 - turnDirection) % 4);
        return;
      } else if (distanceToOthers <= 8) {
        console.log(`unsafe edge, trying to turn`);
        connection.updateDirection((player!.direction + turnDirection) % 4);
        return;
      }
    }

    if (state !== BotState.SAFE && lookaheadSafety(connection, player, Math.max(0, distanceToOthers - 2))) {
      state = BotState.SAFE_RETURN;
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

      connection.updateDirection((player!.direction + turnDirection) % 4);
      state = BotState.RETURNING;

      return;
    }

    if (
      state === BotState.ADVANCING &&
      returnDistance >= distanceToOthers - 5
    ) {
      console.log(`returning`);

      connection.updateDirection((player!.direction + turnDirection) % 4);
      state = BotState.PRE_RETURN;
      preReturnVector = player.position.clone();

      return;
    }

    if (state === BotState.RETURNING && lastSafePosition) {
      if (lastSafePosition.manhattenDistance(player.position) <= 2) {
        let safeDistance = lastSafePosition.distanceInDirection(player.position, player.direction);
        console.log(`safeDistance: ${safeDistance}`);
        console.log(lastSafePosition);
        console.log(player.position);

        if (Math.abs(safeDistance) <= 1) {
          let newDirection = (player!.direction + turnDirection) % 4;
          player.position = lastSafePosition.clone();
          player.position.move(newDirection, -1);
          connection.updateDirection(newDirection);

          console.log(`post return`);
          state = BotState.POST_RETURN;
          return;
        }
      }

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
      turnDirection = 1; // turnDirection === 1 ? 3 : 1;

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
