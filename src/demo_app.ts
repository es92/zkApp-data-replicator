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
  @state(UInt64) bufferSize = State<UInt64>();
  @state(PublicKey) replicator_public_key = State<PublicKey>();

  deploy(args: {
    zkappKey: PrivateKey;
    initialBalance: UInt64;
    initialState: Field;
    replicatorPublicKey: PublicKey;
    bufferSize: UInt64;
  }) {
    super.deploy(args);
    this.self.update.permissions.setValue({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(), // TODO why is this proofOrSignature? Why not just proof?
    });
    this.balance.addInPlace(args.initialBalance);

    this.hash.set(new Field(0))
    this.storage_height.set(new Field(0))
    this.bufferSize.set(args.bufferSize);
    this.replicator_public_key.set(args.replicatorPublicKey)
  }

  @method update(update_hash: Field, update_height: Field, update_signature: Signature) {
    let replicator_pk = this.replicator_public_key.get()
    let valid = update_signature.verify(replicator_pk, [ update_hash, update_height ])
    Bool.assertEqual(valid, new Bool(true));
    let stored_height = this.storage_height.get();
    let bufferSize: Field = this.bufferSize.get().value;
    let bufferedHeight = update_height.add(bufferSize);
    // if bufferedHeight is < stored_height - then update is too old and may not be being stored anymore
    bufferedHeight.assertGt(stored_height);

    this.hash.set(update_hash);
    this.storage_height.set(update_height);
  }
}
