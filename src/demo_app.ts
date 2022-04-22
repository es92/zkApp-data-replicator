import {
  Field,
  state,
  State,
  method,
  UInt64,
  PrivateKey,
  PublicKey,
  SmartContract,
  Mina,
  Party,
  isReady,
  Bool,
  Permissions,
  Poseidon,
  Signature,
  shutdown,
} from 'snarkyjs';


export { SimpleZkapp }

class SimpleZkapp extends SmartContract {
  @state(Field) hash = State<Field>();
  @state(Field) storage_height = State<Field>();
  @state(PublicKey) replicator_public_key = State<PublicKey>();

  deploy(args: {
    zkappKey: PrivateKey;
    initialBalance: UInt64;
    initialState: Field;
    replicatorPublicKey: PublicKey;
  }) {
    super.deploy(args);
    this.self.update.permissions.setValue({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(), // TODO why is this proofOrSignature? Why not just proof?
    });
    this.balance.addInPlace(args.initialBalance);

    this.hash.set(new Field(0))
    this.storage_height.set(new Field(0))
    this.replicator_public_key.set(args.replicatorPublicKey)
  }

  @method update(update_hash: Field, update_height: Field, update_signature: Signature) {
    let replicator_pk = this.replicator_public_key.get()
    let valid = update_signature.verify(replicator_pk, [ update_hash, update_height ])
    Bool.assertEqual(valid, new Bool(true));

    this.hash.set(update_hash);
    this.storage_height.set(update_height);
  }
}
