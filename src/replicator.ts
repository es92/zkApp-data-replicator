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

  to_fields(data: any) {
    var str = JSON.stringify(data);
    var enc = new TextEncoder();
    var uint8s = enc.encode(str)
    var padding_needed = (8 - uint8s.length % 4 ) % 4;

    var padded = new Uint8Array(uint8s.length + padding_needed + 4);
    padded.fill(0);
    padded.set(uint8s, 0);
    padded.set(Uint8Array.from([ 0, 0, 0, padding_needed ]), padded.byteLength-4);
    var uint32s = new Uint32Array(padded.buffer)
    var fields = Array.from(uint32s).map((x) => Field(x));
    return fields
  }

  from_fields(fields: Field[]) {
    var uint32s = Uint32Array.from(fields.map((f) => Number(f.toString())));
    var uint8s = new Uint8Array(uint32s.buffer);
    var padding_needed = uint8s[uint8s.byteLength-1];
    var encoded = uint8s.slice(0, uint8s.byteLength - 4 - padding_needed);
    var dec = new TextDecoder();
    var str = dec.decode(encoded)
    return JSON.parse(str);
  }

  async cleanup_all(wmina: any) {
    let pk58s = Object.keys(this.stores);
    for (var i = 0; i < pk58s.length; i++) {
      var pk58 = pk58s[i];
      let pk = PublicKey.fromBase58(pk58);
      let zkappState = (await wmina.call('getAppState', pk)).map((f: any) => Field.fromJSON(f));
      var latestHeight = Number(zkappState[1].toString());
      this.stores[pk58] = this.stores[pk58].filter((x) => x.height >= latestHeight - this.bufferSize);
    }
  }
}
