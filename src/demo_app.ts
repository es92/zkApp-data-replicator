import {
  Field,
  state,
  State,
  method,
  UInt64,
  PrivateKey,
  SmartContract,
  Mina,
  Party,
  isReady,
  Bool,
  Permissions,
  Poseidon,
  shutdown,
} from 'snarkyjs';


export { SimpleZkapp }

class SimpleZkapp extends SmartContract {
  @state(Field) x = State<Field>();

  deploy(args: {
    zkappKey: PrivateKey;
    initialBalance: UInt64;
    initialState: Field;
  }) {
    super.deploy(args);
    this.self.update.permissions.setValue({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
    this.balance.addInPlace(args.initialBalance);
    this.x.set(args.initialState);
  }

  @method update(y: Field) {
    let x = this.x.get();
    this.x.set(x.add(y));
  }
}
