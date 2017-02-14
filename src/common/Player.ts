import Position from "../packets/mixins/Position";


export default class Player {
  name: string;
  skin: number;
  trail: Position[] = [];
  position: Position; // @todo Do not use the PacketProperty directly
  lastPositionUpdate: Date;
  direction: number;

  constructor(
    public id: number
  ) {
    
  }

  move(direction: number, count: number) {
    this.position.move(direction, count);
  }
  
  die() {

  }

  get isMyPlayer() {
    return this.id === 0;
  }
}
