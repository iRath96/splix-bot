import "reflect-metadata";
import Scope from "../Scope";


interface IPacketProperty {
  name: string;
  type: typeof PacketProperty;
}

export type TPacketId = [ Scope, number ];
export class Packet {
  [key: string]: any;

  static packetId: TPacketId | null = null;
  static properties: IPacketProperty[] = [];
  static handlers: [ TPacketId, typeof Packet ][] = [];

  get class(): typeof Packet {
    return <any>this.constructor;
  }

  protected serializeProperties(): number[] {
    return this.class.properties.reduce((array, property) =>
      [ ...array, ...(<PacketProperty<any>>this[property.name]).serialize() ]
    , <number[]>[]);
  }

  protected deserializeProperties(raw: number[]) {
    this.class.properties.reduce((array, property) => {
      (<PacketProperty<any>>this[property.name]).deserialize(array);
      return array;
    }, raw);
    return this;
  }

  serialize(): number[] {
    let raw = <any>this.serializeProperties();
    if (this.class.packetId !== null)
      raw.unshift(this.class.packetId[1]);
    return raw;
  }
  
  deserialize(raw: number[]) {
    this.deserializeProperties(raw);
  }

  static deserialize(scope: Scope, raw: number[]) {
    let packetId = raw.shift()!;
    let handler = (<any>this.handlers).find((handler: any) =>
      handler[0][0] === scope && handler[0][1] === packetId
    );

    if (handler === undefined)
      throw new Error(`No packet class for packet-id ${packetId} in scope ${Scope[scope]}`);

    let packet = new handler[1]();
    packet.deserialize(raw);

    return packet;
  }
}

export abstract class PacketProperty<T> extends Packet {
  abstract value: T;
}

export const prop: PropertyDecorator = (target: { constructor: typeof Packet }, property: string) => {
  var type = Reflect.getMetadata("design:type", target, property);
  
  target.constructor.properties = [
    ...target.constructor.properties,
    {
      name: property,
      type
    }
  ];
};

export function id(scope: Scope, id: number): ClassDecorator {
  return (target: typeof Packet) => {
    target.packetId = [ scope, id ];
    Packet.handlers.push([ [ scope, id ], target ]);
  };
}
