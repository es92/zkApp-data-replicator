

import { Wrapped_Mina } from './wrapped_mina.js';
import { Handler } from './reqres.js';


function main() {
  var wmina = new Wrapped_Mina()

  var handler = new Handler();

  handler.on('test_fn', (args: any) => {
    return new Promise((result: any, error: any) => {
      result('done23');
    });
  });
}

main();
