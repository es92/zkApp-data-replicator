import {
  Field,
  state,
  State,
  method,
  UInt64,
  PrivateKey,
  PublicKey,
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
  var replicator: any = new Requester('ws://localhost:3001');
  //var rrr = await r.call('test_fn', { 'hi': 7 })
  //console.log('got response!', rrr);

  //var wmina = new Wrapped_Mina()

  let bufferSize = 8;

  //let replicator = new Replicator(bufferSize);
  //let replicator_pk = replicator.pk;
  let replicator_pk = <any>PublicKey.fromJSON(await replicator.call('get_pk'));

  let initiating_account: any = PrivateKey.fromJSON((await wmina.call('get_test_account', 0)));

  let zkappKey = PrivateKey.random();
  let zkappAddress = zkappKey.toPublicKey();

  await replicator.call('register_account', zkappAddress.toJSON());

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

  var fields = (await replicator.call('to_fields', { "test": [ 7, 4 ] })).map((f: any) => <any>Field.fromJSON(f));
  var data = await replicator.call('from_fields', fields.map((f: any) => f.toJSON()));
  let result = await replicator.call('request_store', 
                              { zkappAddress: zkappAddress.toJSON(), 
                                fields: fields.map((f: any) => f.toJSON()) });

  if (result != null) {
    let { hash, height, signature } = result;
    hash = Field.fromJSON(hash);
    height = Field.fromJSON(height);
    signature = Signature.fromJSON(signature);
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

  let stored_data = (await replicator.call('get_stored', { zkappAddress: zkappAddress.toJSON(), zkappState: zkappState[0].toJSON() })).map((f: any) => <any>Field.fromJSON(f));
  if (stored_data != null) {
    var data = (await replicator.call('from_fields', stored_data.map((f: any) => f.toJSON())));
    console.log('got', data);
  }

  await replicator.call('cleanup_all');

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
