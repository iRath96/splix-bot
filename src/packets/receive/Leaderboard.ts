import { Packet, prop, id } from "../common/Packet";
import { Byte, Integer, LongInteger, String } from "../types";
import { Scope, Action } from "./Action";


@id(Scope, Action.LEADERBOARD)
export default class LeaderboardPacket extends Packet {
  @prop totalPlayers = new Integer();
  
  scores: { [name: string]: number } = {};

  serialize() {
    return Object.keys(this.scores).reduce((raw, key) => {
      let score = new LongInteger(this.scores[key]);
      let nameLength = new Byte(key.length);
      let name = new String(key);

      return [
        ...raw,
        ...score.serialize(),
        ...nameLength.serialize(),
        ...name.serialize()
      ];
    }, super.serialize());
  }

  deserialize(game: any, raw: number[]) {
    super.deserialize(game, raw);
    
    while (raw.length > 0) {
      let score = new LongInteger();
      score.deserialize(game, raw);

      let nameLength = new Byte();
      nameLength.deserialize(game, raw);

      let name = new String();
      name.deserialize(game, raw.splice(0, nameLength.value));

      this.scores[name.value] = score.value;
    }
  }
}
