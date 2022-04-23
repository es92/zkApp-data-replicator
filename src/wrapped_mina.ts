import {
  Field,
  state,
  State,
  method,
  UInt64,
  PrivateKey,
  Signature,
  SmartContract,
  Mina,
  Party,
  isReady,
  Bool,
  Permissions,
  Poseidon,
  shutdown,
} from 'snarkyjs';

export { Wrapped_Mina }

await isReady;

const gLocal = Mina.LocalBlockchain();

class Wrapped_Mina {
  Local: any;

  constructor() {
    this.Local = gLocal;
    try {
      Mina.currentSlot();
    } catch {
      Mina.setActiveInstance(this.Local);
    }

  }
}
