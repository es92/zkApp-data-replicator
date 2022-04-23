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

import { io } from "socket.io-client";

import { SimpleZkapp } from './demo_app.js'
import { Replicator } from './replicator.js'
import { Wrapped_Mina } from './wrapped_mina.js'

await isReady;

// =======================================================

async function main() {

  var socket = io('ws://localhost:3000')
  socket.emit('event', 'data');

  var wmina = new Wrapped_Mina()

  let bufferSize = 8;

  let replicator = new Replicator(bufferSize);
  let replicator_pk = replicator.pk;

  let initiating_account = wmina.Local.testAccounts[0].privateKey;

  let zkappKey = PrivateKey.random();
  let zkappAddress = zkappKey.toPublicKey();

  replicator.register_account(zkappAddress);

  let initialBalance = UInt64.fromNumber(10_000_000_000);
  let initialState = Field(1);

  // -----------------------------------------

  console.log('deploy');
  let zkapp = new SimpleZkapp(zkappAddress);
  deploy(wmina.Local, initiating_account, zkapp, 
        { zkappKey, 
          initialBalance, 
          initialState,
          replicatorPublicKey: replicator_pk, 
          bufferSize: UInt64.fromNumber(bufferSize) });

  let zkappState = (await Mina.getAccount(zkappAddress)).zkapp.appState;
  console.log('initial state: ' + zkappState);

  // -----------------------------------------

  console.log('update');

  var fields = replicator.to_fields({ "test": [ 7, 4 ] })
  var data = replicator.from_fields(fields);
  let result = replicator.request_store(zkappAddress, fields);

  if (result != null) {
    let { hash, height, signature } = result;
    wmina.Local.transaction(initiating_account, async () => {
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
    var data = replicator.from_fields(stored_data);
    console.log('got', data);
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
