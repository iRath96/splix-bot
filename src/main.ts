import Connection from "./Connection";

let connection = new Connection({
  url: "ws://46.101.153.56:8001/splix",
  name: "Cheese"
});

connection.addListener("open", () => {
  setInterval(() => {
    connection.update();
    connection.render();
  }, 160);

  let seq = [ 15, 4, 12, 4 ];
  let seqI = 0;
  let i = 0;

  setInterval(() => {
    if (i > 0) {
      --i;
      return;
    }

    i = seq[seqI++];
    seqI = seqI % seq.length;
    
    let player = connection.game.ownPlayer;
    if (player && player.position) {
      connection.sendUpdateDirection(
        (player.direction + 1) % 4,
        player.position.x.value,
        player.position.y.value
      );
    }
  }, 160);
});

connection.addListener("close", () => {
  process.exit();
});
