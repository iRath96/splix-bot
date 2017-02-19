// this script can be used to identify servers with few users on them
// this can be useful for debugging the bot


import * as fetch from "isomorphic-fetch";
import Connection from "./common/Connection";


interface ILobby {
  ipv4: string;
  hash: string;
  port: number;
}

interface IVersion {
  ver: number;
  lobbies: ILobby[];
}

interface IGamemode {
  versions: IVersion[];
  gm: "default" | "teams";
}

interface ILocation {
  loc: string;
  pingIpv4: string;
  gamemodes: IGamemode[];
}

interface IServers {
  locations: ILocation[];
}

function flatten<T>(array: T[][]): T[] {
  return array.reduce((flat, a) =>
    [ ...flat, ...a ]
  , []);
}

fetch("http://splix.io/json/servers.2.json")
  .then(res => <Promise<IServers>>res.json())
  .then(res => {
    // find all lobbies
    let lobbies = flatten(
      res.locations.map(location =>
        flatten(
          location.gamemodes
            .filter(gamemode => gamemode.gm === "default")
            .map(gamemode =>
              flatten(
                gamemode.versions
                  .map(version => version.lobbies)
              )
            )
        )
      )
    );

    let existing = lobbies.reduce((set, lobby) =>
      set.add(`${lobby.ipv4}:${lobby.port}`)
    , new Set());

    // test which lobbies might exist but were not listed

    let knownHosts = lobbies.map(lobby => lobby.ipv4);
    let expectedLobbies = flatten(
      knownHosts.map(host => [
        { ipv4: host, port: 8001 },
        { ipv4: host, port: 8002 }
      ])
    );

    let newLobbies = expectedLobbies.filter(lobby =>
      !existing.has(`${lobby.ipv4}:${lobby.port}`)
    );

    let playerCounts = new Map<string, number>();

    [ ...lobbies, ...newLobbies ].forEach(lobby => {
      let connection = new Connection({
        url: `ws://${lobby.ipv4}:${lobby.port}/splix`,
        name: "Cheese"
      });

      connection.on("leaderboard", leaderboard => {
        playerCounts.set(`${lobby.ipv4}:${lobby.port}`, leaderboard.totalPlayers.value);
        connection.disconnect();
      });
    });

    // kill the process after some time and report the results

    setTimeout(() => {
      [ ...playerCounts.entries() ]
        .sort((a, b) => a[1] - b[1])
        .forEach(([ server, count ]) => {
          console.log(`${server} => ${count}`);
        });

      process.exit();
    }, 5000);
  });
