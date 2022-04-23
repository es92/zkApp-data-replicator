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
import { Requester } from './reqres.js';

await isReady;

// =======================================================

async function main() {

  var wmina: any = new Requester('ws://localhost:3000');
  //var rrr = await r.call('test_fn', { 'hi': 7 })
  //console.log('got response!', rrr);

  //var wmina = new Wrapped_Mina()

  let bufferSize = 8;

  let replicator = new Replicator(bufferSize);
  let replicator_pk = replicator.pk;

  let initiating_account: any = PrivateKey.fromJSON((await wmina.call('get_test_account', 0)));

  let zkappKey = PrivateKey.random();
  let zkappAddress = zkappKey.toPublicKey();

  replicator.register_account(zkappAddress);

  let initialBalance = UInt64.fromNumber(10_000_000_000);
  let initialState = Field(1);

  // -----------------------------------------

  console.log('deploy');
  await wmina.call('deploy', {
    initiating_account: initiating_account.toJSON(), 
    zkappAddress: zkappAddress.toJSON(), 
    args: { zkappKey: zkappKey.toJSON(), 
      initialBalance: initialBalance.toJSON(), 
      initialState: initialState.toJSON(),
      replicatorPublicKey: replicator_pk.toJSON(), 
      bufferSize: UInt64.fromNumber(bufferSize).toJSON() }
  });
  //let zkappState = (await Mina.getAccount(zkappAddress)).zkapp.appState;
  let zkappState = (await wmina.call('getAppState', zkappAddress.toJSON())).map((f: any) => Field.fromJSON(f));
  console.log('initial state: ' + zkappState);

  // -----------------------------------------

  console.log('update');

  var fields = replicator.to_fields({ "test": [ 7, 4 ] })
  var data = replicator.from_fields(fields);
  let result = replicator.request_store(zkappAddress, fields);

  if (result != null) {
    let { hash, height, signature } = result;
    wmina.call('transaction', { 
      hash: hash.toJSON(),
      height: height.toJSON(),
      signature: signature.toJSON(),
      initiating_account: initiating_account.toJSON(),
      zkappAddress: zkappAddress.toJSON(),
      privateKey: zkappKey.toJSON(),
    });
  }

  zkappState = (await wmina.call('getAppState', zkappAddress.toJSON())).map((f: any) => Field.fromJSON(f));
  console.log('state after store: ' + zkappState);

  let stored_data = replicator.get_stored(zkappAddress, zkappState[0])
  if (stored_data != null) {
    var data = replicator.from_fields(stored_data);
    console.log('got', data);
  }

  await replicator.cleanup_all(wmina);

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
