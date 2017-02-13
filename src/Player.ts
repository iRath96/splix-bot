import Position from "./packets/mixins/Position";


export default class Player {
  name: string;
  skin: number;
  trail: Position[] = [];
  position: Position; // @todo Do not use the PacketProperty directly
  direction: number;

  constructor(
    public id: number
  ) {
    
  }

  move(direction: number, count: number) {
    switch (direction) {
    case 0: this.position.x.value += count; break;
    case 1: this.position.y.value += count; break;
    case 2: this.position.x.value -= count; break;
    case 3: this.position.y.value -= count; break;
    }
  }
  
  die() {

  }

  get isMyPlayer() {
    return this.id === 0;
  }
}
