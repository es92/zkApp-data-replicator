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

import { SimpleZkapp } from './demo_app.js'
import { Replicator } from './replicator.js'

await isReady;

// =======================================================

async function main() {
  let Local = Mina.LocalBlockchain();
  Mina.setActiveInstance(Local);

  let bufferSize = 8;

  let replicator = new Replicator(bufferSize);
  let replicator_pk = replicator.pk;

  let initiating_account = Local.testAccounts[0].privateKey;

  let zkappKey = PrivateKey.random();
  let zkappAddress = zkappKey.toPublicKey();

  replicator.register_account(zkappAddress);

  let initialBalance = UInt64.fromNumber(10_000_000_000);
  let initialState = Field(1);

  // -----------------------------------------

  console.log('deploy');
  let zkapp = new SimpleZkapp(zkappAddress);
  deploy(Local, initiating_account, zkapp, { zkappKey, initialBalance, initialState, replicatorPublicKey: replicator_pk, bufferSize: UInt64.fromNumber(bufferSize) });

  let zkappState = (await Mina.getAccount(zkappAddress)).zkapp.appState;
  console.log('initial state: ' + zkappState);

  // -----------------------------------------

  console.log('update');
  let result = replicator.request_store(zkappAddress, [ Field(2) ]);
  if (result != null) {
    let { hash, height, signature } = result;
    Local.transaction(initiating_account, async () => {
      let zkapp = new SimpleZkapp(zkappAddress);
      zkapp.update(hash, height, signature);
      zkapp.self.sign(zkappKey);
      zkapp.self.body.incrementNonce = Bool(true);
    }).send();
  }

  zkappState = (await Mina.getAccount(zkappAddress)).zkapp.appState;
  console.log('state after store: ' + zkappState);

  let stored_data = replicator.get_stored(zkappAddress, zkappState[0])
  if (stored_data != null) {
    console.log(stored_data.map((f) => f.toString()));
  }

  await replicator.cleanup_all();

  // -----------------------------------------

  shutdown();
}

// =======================================================

function deploy(Local: any, initiating_account: PrivateKey, zkapp: SimpleZkapp, args: any) {
  Local.transaction(initiating_account, () => {
    const p = Party.createSigned(initiating_account, { isSameAsFeePayer: true });
    p.balance.subInPlace(args.initialBalance);
    zkapp.deploy(args)
  }).send();
}

// =======================================================

main();
