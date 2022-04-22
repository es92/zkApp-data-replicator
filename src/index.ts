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

await isReady;

// =======================================================

async function main() {
  let Local = Mina.LocalBlockchain();
  Mina.setActiveInstance(Local);

  let initiating_account = Local.testAccounts[0].privateKey;
  let replicator_sk = Local.testAccounts[1].privateKey;
  let replicator_pk = Local.testAccounts[1].publicKey;
  let replicatorPublicKey = replicator_pk;

  let zkappKey = PrivateKey.random();
  let zkappAddress = zkappKey.toPublicKey();

  let initialBalance = UInt64.fromNumber(10_000_000_000);
  let initialState = Field(1);

  // -----------------------------------------

  console.log('deploy');
  let zkapp = new SimpleZkapp(zkappAddress);
  deploy(Local, initiating_account, zkapp, { zkappKey, initialBalance, initialState, replicatorPublicKey });

  let zkappState = (await Mina.getAccount(zkappAddress)).zkapp.appState;
  console.log('initial state: ' + zkappState);

  // -----------------------------------------

  console.log('update');
  Local.transaction(initiating_account, async () => {
    let zkapp = new SimpleZkapp(zkappAddress);
    let update_hash = Poseidon.hash([ Field(2) ])
    let update_height = Field(1);
    let update_signature = Signature.create(replicator_sk, [ update_hash, update_height ]);
    zkapp.update(update_hash, update_height, update_signature);
    zkapp.self.sign(zkappKey);
    zkapp.self.body.incrementNonce = Bool(true);
  }).send();

  // -----------------------------------------

  zkappState = (await Mina.getAccount(zkappAddress)).zkapp.appState;
  console.log('final state: ' + zkappState);

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
