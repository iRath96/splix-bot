import Vector from "./Vector";


export default class Player {
  name: string;
  skin: number;
  trail: Vector[] = [];
  position: Vector;
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

  trailDistance(other: Player) {
    function lineDistance(a: Vector, b: Vector, p: Vector) {
      if (p.x >= a.x && p.x <= b.x)
        return Math.abs(a.y - p.y); // a.y = b.y
      else if (p.y >= a.y && p.y <= b.y)
        return Math.abs(a.x - p.x); // a.x = b.x
      else
        return Math.min(
          a.manhattenDistance(p),
          b.manhattenDistance(p)
        );
    }

    let distances: number[] = [];
    [ ...this.trail, this.position ].reduce((a, b) => {
      distances.push(lineDistance(a, b, other.position));
      return b;
    })

    return Math.min(...distances);
  }
}
