/**
 * Specifies the context of a packet.
 */
enum Scope {
  SERVER = 0, /** Packets sent by the server. */
  CLIENT = 1  /** Packets sent by the client. */
}

export default Scope;
