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


import { Wrapped_Mina } from './wrapped_mina.js';
import { Handler } from './reqres.js';
import { SimpleZkapp } from './demo_app.js'


function main() {
  var wmina = new Wrapped_Mina()

  var handler = new Handler();

  handler.on('test_fn', (args: any) => {
    return new Promise((result: any, error: any) => {
      result('done23');
    });
  });

  handler.on('get_test_account', async (idx: number) => {
    return wmina.Local.testAccounts[idx].privateKey.toJSON();
  });

  handler.on('deploy', async (args: any) => {
    let zkappAddress: any = PublicKey.fromJSON(args.zkappAddress);
    let zkapp = new SimpleZkapp(args.zkappAddress);
    let initiating_account: any = PrivateKey.fromJSON(args.initiating_account);
    await deploy(wmina.Local, initiating_account, zkapp, args.args);
  });
}

async function deploy(Local: any, initiating_account: PrivateKey, zkapp: any, args: any) {
  Local.transaction(initiating_account, () => {
    const p = Party.createSigned(initiating_account, { isSameAsFeePayer: true });
    p.balance.subInPlace(<any>UInt64.fromJSON(args.initialBalance));
    var obj = {
      zkappKey: PrivateKey.fromJSON(args.zkappKey),
      initialBalance: <any>UInt64.fromJSON(args.initialBalance),
      initialState: Field.fromJSON(args.initialState),
      replicatorPublicKey: PublicKey.fromJSON(args.replicatorPublicKey),
      bufferSize: <any>UInt64.fromJSON(args.bufferSize)
    };
    console.log(obj);
    zkapp.deploy(obj);
  }).send();
}

main();
