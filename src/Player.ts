import Position from "./packets/mixins/Position";


export default class Player {
  name: string;
  skin: number;
  trail: Position[];
  position: Position;

  constructor(
    public id: number
  ) {
    
  }
  
  die() {

  }
}
