import Vector from "./common/Vector";

class MapWithDefault<TKey, TValue> {
  protected map = new Map<TKey, TValue>();

  constructor(
    public callback: (map: MapWithDefault<TKey, TValue>, key: TKey) => TValue
  ) {
  }

  has(k: TKey) { return this.map.has(k); }
  get(k: TKey) {
    if (!this.map.has(k))
      this.map.set(k, this.callback(this, k));
    return this.map.get(k)!;
  }

  keys() {
    return this.map.keys();
  }
}

export class Node extends Vector {
}

export class Edge {
  public meta: any;

  constructor(
    public a: Node,
    public b: Node
  ) {

  }

  get x() { return this.a.x; }
  get y() { return this.b.y; }

  get dx() { return this.b.x - this.a.x; }
  get dy() { return this.b.y - this.a.y; }

  get minX() { return Math.min(this.a.x, this.b.x); }
  get maxX() { return Math.max(this.a.x, this.b.x); }
  get minY() { return Math.min(this.a.y, this.b.y); }
  get maxY() { return Math.max(this.a.y, this.b.y); }

  get isXEdge() { return this.a.x === this.b.x; }
  get isYEdge() { return this.a.y === this.b.y; }

  static metaOff = new Map<string, number>();
  static counter = 0;

  get xOff() {
    // @todo For debugging
    if (!Edge.metaOff.has(this.meta))
      Edge.metaOff.set(this.meta, Edge.metaOff.size);
    return Edge.metaOff.get(this.meta)!;
  }

  get yOff() {
    // @todo For debugging
    return this.xOff;// + ++Edge.counter;
  }
}

export class Graph {
  protected nodes = new Set<Node>();
  protected nodesX = new MapWithDefault<number, Set<Node>>(() => new Set<Node>()); /** Nodes with x value */
  protected nodesY = new MapWithDefault<number, Set<Node>>(() => new Set<Node>()); /** Nodes with y value */
  
  protected edges = new Set<Edge>();
  protected edgesIn  = new MapWithDefault<Node, Set<Edge>>(() => new Set<Edge>()); /** Edges pointing into a node */
  protected edgesOut = new MapWithDefault<Node, Set<Edge>>(() => new Set<Edge>()); /** Edges pointing out of a node */

  protected edgesX = new MapWithDefault<number, Set<Edge>>(() => new Set<Edge>()); /** Edges with constant x */
  protected edgesY = new MapWithDefault<number, Set<Edge>>(() => new Set<Edge>()); /** Edges with constant y */

  dump() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    version="2.0" baseProfile="full"
    width="800px" height="600px">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="0" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" />
    </marker>
  </defs>

  ${[ ...this.nodes.values() ].map(node =>
    `<circle cx="${node.x}" cy="${node.y}" r="3" fill="black" />
     <text x="${node.x - 10}" y="${node.y - 5}" font-family="Verdana" font-size="8">
       i/o ${this.edgesIn.get(node).size}/${this.edgesOut.get(node).size}
     </text>`
  ).join("\n  ")}

  ${[ ...this.edges.values() ].map(edge =>
    `<line x1="${edge.a.x + edge.xOff}" y1="${edge.a.y + edge.yOff}" x2="${edge.b.x + edge.xOff}" y2="${edge.b.y + edge.yOff}" stroke="${edge.meta}" stroke-width="1" marker-end="url(#arrow)" />`
  ).join("\n  ")}
</svg>`;
  }

  createEdge(a: Node, b: Node, meta: any) {
    let edge = new Edge(a, b);
    edge.meta = meta;

    if (a.x === b.x && a.y === b.y)
      throw new Error("Edge without length");

    if (a.x === b.x) {
      this.edgesX.get(a.x).add(edge);
    } else if (a.y === b.y) {
      this.edgesY.get(a.y).add(edge);
    } else {
      throw new Error("Invalid edge (not aligned to grid)");
    }

    this.edges.add(edge);
    this.edgesOut.get(a).add(edge);
    this.edgesIn.get(b).add(edge);

    return edge;
  }

  removeEdge(edge: Edge) {
    if (edge.isXEdge)
      this.edgesX.get(edge.x).delete(edge);
    else if (edge.isYEdge)
      this.edgesY.get(edge.y).delete(edge);
    
    this.edges.delete(edge);
    this.edgesOut.get(edge.a).delete(edge);
    this.edgesIn.get(edge.b).delete(edge);
  }

  createNode(x: number, y: number) {
    if (this.nodesX.has(x) && this.nodesY.has(y)) {
      // the node might exist
      let node = [ ...this.nodesX.get(x).values() ]
        .find(node => node.y === y);
      
      if (node !== undefined)
        return node;
    }

    let node = new Node(x, y);
    this.nodes.add(node);
    this.nodesX.get(x).add(node);
    this.nodesY.get(y).add(node);
    return node;
  }

  protected splitNodes: Set<Node>;
  protected newEdges: Set<Edge>;
  protected temporaryEdges: Set<Edge>;

  protected handleEdgeCollisions(newEdge: Edge, oldEdge: Edge) {
    let testEdges = new Set<Edge>();

    console.log(newEdge, oldEdge);
    if (newEdge.isXEdge === oldEdge.isXEdge)
      throw new Error("Edge collision with edge overlay not implemented");
    
    let winding = oldEdge.dx * newEdge.dy - oldEdge.dy * newEdge.dx;
    console.log(winding);

    let x = newEdge.isXEdge ? newEdge.x : oldEdge.x;
    let y = newEdge.isYEdge ? newEdge.y : oldEdge.y;

    let node = this.createNode(x, y);
    this.splitNodes.add(node);

    // split up new edge
    this.newEdges.delete(newEdge);
    this.removeEdge(newEdge);

    let newA = this.createEdge(newEdge.a, node, newEdge.meta);
    let newB = this.createEdge(node, newEdge.b, newEdge.meta);

    this.newEdges.add(newA);
    this.newEdges.add(newB);

    testEdges.add(newA);
    testEdges.add(newB);

    // split up old edge
    this.temporaryEdges.delete(oldEdge); // might be temporary already
    this.removeEdge(oldEdge);
    //this.createEdge(node, winding < 0 ? newEdge.a : newEdge.b, oldEdge.meta);

    // create temporary edge for collision detection
    let oldA = this.createEdge(oldEdge.a, node, oldEdge.meta);
    let oldB = this.createEdge(node, oldEdge.b, oldEdge.meta);
    this.temporaryEdges.add(winding > 0 ? oldA : oldB);
    
    return testEdges;
  }

  protected findCollidingEdge(edge: Edge) {
    let result: Edge | undefined = undefined;

    // @todo This is not DRY
    if (!result)
      [ ...this.edgesX.keys() ].find(x => {
        if (x <= edge.minX && x >= edge.maxX)
          return false;
        
        result = [ ...this.edgesX.get(x) ].find(other =>
          !this.newEdges.has(other) && other.minY < edge.maxY && other.maxY > edge.maxY
        );

        return result !== undefined;
      });

    if (!result)
      [ ...this.edgesY.keys() ].find(y => {
        if (y <= edge.minY && y >= edge.maxY)
          return false;
        
        result = [ ...this.edgesY.get(y) ].find(other =>
          !this.newEdges.has(other) && other.minX < edge.maxX && other.maxX > edge.maxX
        );

        return result !== undefined;
      });
    
    return result;
  }

  fillArea(x: number, y: number, width: number, height: number, meta: any) {
    this.splitNodes = new Set<Node>();
    this.newEdges = new Set<Edge>();
    this.temporaryEdges = new Set<Edge>();

    // create new nodes
    [
      this.createNode(x, y),
      this.createNode(x + width, y),
      this.createNode(x + width, y + height),
      this.createNode(x, y + height),
      this.createNode(x, y)
    ].reduce((prevNode, node) => {
      let newEdge = this.createEdge(prevNode, node, meta);
      this.newEdges.add(newEdge);

      let testEdges = new Set<Edge>();
      testEdges.add(newEdge);

      while (testEdges.size > 0) {
        let testEdge = [ ...testEdges ][0];
        testEdges.delete(testEdge);

        let collidingEdge = this.findCollidingEdge(testEdge);
        if (collidingEdge !== undefined) {
          // handle collision
          this.handleEdgeCollisions(testEdge, collidingEdge)
            .forEach(newEdge => testEdges.add(newEdge));
        }
      }
      
      return node;
    });

    // remove temporary edges
    this.temporaryEdges.forEach(edge =>
      this.removeEdge(edge)
    );

    // complete cycles for split nodes
    let splitOut = new Map<Node, Node>();
    this.newEdges.forEach(newEdge => {
      splitOut.set(newEdge.b, newEdge.a);
    });

    //if (0 < 1) return;
    while (this.splitNodes.size > 0) {
      let split = [ ...this.splitNodes ][0];
      this.splitNodes.delete(split);

      if (this.edgesIn.get(split).size < 2)
        // this is a split sink, not a source
        continue;
      
      console.log(split);
      
      let splitMeta = [ ...this.edgesIn.get(split) ]
        .map(edge => edge.meta)
        .find(splitMeta => splitMeta !== meta)
      if (splitMeta === undefined)
        throw new Error("No split meta information");

      while (true) {
        let isComplete = [ ...this.edgesOut.get(split) ].find(edge => edge.meta === splitMeta) !== undefined;
        if (isComplete)
          break;
        
        this.createEdge(split, split = splitOut.get(split)!, splitMeta);
        this.splitNodes.delete(split);
      }
    }
  }
}

let g = new Graph();
g.fillArea(100, 100, 200, 200, "#ff0000");
//g.fillArea(310, 100, 200, 200, "#0000ff");
g.fillArea(80, 220, 300, 240, "#00ff00");

let svg = g.dump();
// console.log(svg);

import * as fs from "fs";
fs.writeFileSync("dump.svg", svg);
