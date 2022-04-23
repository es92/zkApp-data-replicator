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

await isReady;


import { Replicator } from './replicator.js'
import { Handler } from './reqres.js';
import { SimpleZkapp } from './demo_app.js'
import { Requester } from './reqres.js';


function main() {
  var wmina: any = new Requester('ws://localhost:3000');
  let bufferSize = 8;

  let replicator = new Replicator(bufferSize);
  let replicator_pk = replicator.pk;

  var handler = new Handler(3001);

  handler.on('get_pk', async (args: any) => {
    return replicator_pk;
  });

  handler.on('register_account', async (zkappAddress: any) => {
    replicator.register_account(<any>PublicKey.fromJSON(zkappAddress));
  });

  handler.on('to_fields', async (args: any) => {
    return replicator.to_fields(args);
  });

  handler.on('from_fields', async (fields: any) => {
    return replicator.from_fields(fields.map((f: any) => <any>Field.fromJSON(f)));
  });

  handler.on('request_store', async(args: any) => {
    return replicator.request_store(<any>PublicKey.fromJSON(args.zkappAddress), args.fields.map((f: any) => <any>Field.fromJSON(f)));
  });
  
  handler.on('get_stored', async (args: any) => {
    return replicator.get_stored(<any>PublicKey.fromJSON(args.zkappAddress), <any>Field.fromJSON(args.zkappState))
  });

  handler.on('cleanup_all', async (args: any) => {
    await replicator.cleanup_all(wmina);
  });
}

main();
