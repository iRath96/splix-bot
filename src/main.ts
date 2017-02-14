import Connection from "./common/Connection";

var keypress = require("keypress");
keypress(process.stdin);

(process.stdin as any).setRawMode(true);
process.stdin.resume();

//

let connection = new Connection({
  url: "ws://46.101.153.56:8001/splix",
  name: "Cheese"
});

connection.addListener("open", () => {
  process.stdin.on("keypress", (ch: any, key: any) => {
    if (!key)
      return;

    if (key.ctrl && key.name === "c") {
      process.exit();
      return;
    }
    
    switch (key.name) {
    case "right": connection.updateDirection(0); break;
    case "down":  connection.updateDirection(1); break;
    case "left":  connection.updateDirection(2); break;
    case "up":    connection.updateDirection(3); break;
    }
  });

  setInterval(() => {
    connection.update();
    connection.render();
  }, 160);
});

connection.addListener("close", () => {
  process.exit();
});
