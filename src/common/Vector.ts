export default class Vector {
  constructor(
    public x: number = 0,
    public y: number = 0
  ) {
  }

  clone() {
    return new Vector(this.x, this.y);
  }

  move(direction: number, count: number) {
    switch (direction) {
    case 0: this.x += count; break;
    case 1: this.y += count; break;
    case 2: this.x -= count; break;
    case 3: this.y -= count; break;
    }
  }

  euclideanDistance(other: Vector) {
    let dx = this.x - other.x;
    let dy = this.y - other.y;

    return Math.sqrt(
      dx * dx + dy * dy
    );
  }

  manhattenDistance(other: Vector) {
    let dx = this.x - other.x;
    let dy = this.y - other.y;

    return Math.abs(dx) + Math.abs(dy);
  }
}