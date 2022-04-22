import {
  PrivateKey,
  PublicKey,
  Field,
  Poseidon,
  Signature,
  Mina,
} from 'snarkyjs';

export { Replicator }

class Replicator {
  sk: PrivateKey;
  pk: PublicKey;

  bufferSize: number;

  stores: { [pk58: string]: Array<{ height: number, hash: Field, data: Field[] }> };

  constructor(bufferSize: number) {
    this.sk = PrivateKey.random();
    this.pk = this.sk.toPublicKey();
    this.stores = {};
    this.bufferSize = bufferSize;
  }

  register_account(addr: PublicKey) {
    if (!(addr.toBase58() in this.stores)) {
      this.stores[addr.toBase58()] = [ { height: 0, hash: Field(0), data: [] } ];
    }
  }

  request_store(addr: PublicKey, fields: Field[]) {
    let store = this.stores[addr.toBase58()];
    if (store == null) {
      return null;
    } else {
      let hash = Poseidon.hash(fields);
      let height = store[store.length-1].height + 1;
      store.push({ hash, height, data: fields });
      let signature = Signature.create(this.sk, [ hash, Field(height) ]);
      return { hash, height: Field(height), signature };
    }
  }
  
  get_stored(addr: PublicKey, hash: Field) {
    let store = this.stores[addr.toBase58()];
    if (store == null) {
      return null;
    } else {
      for (var i = 0; i < store.length; i++) {
        if (store[i].hash.equals(hash).toBoolean()) {
          return store[i].data;
        }
      }
    }
    return null;
  }

  async cleanup_all() {
    let pk58s = Object.keys(this.stores);
    for (var i = 0; i < pk58s.length; i++) {
      var pk58 = pk58s[i];
      let zkappState = (await Mina.getAccount(PublicKey.fromBase58(pk58))).zkapp.appState
      var latestHeight = Number(zkappState[1].toString());
      this.stores[pk58] = this.stores[pk58].filter((x) => x.height >= latestHeight - this.bufferSize);
    }
  }
}
