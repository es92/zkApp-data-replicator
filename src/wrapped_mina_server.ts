

import { Wrapped_Mina } from './wrapped_mina.js';

import http from 'http';
import * as socketio from "socket.io";

function main() {
  var wmina = new Wrapped_Mina()

  const server = http.createServer();
  const io = new socketio.Server(server);
  io.on('connection', (client: any) => {
    console.log('connection');
    client.on('event', (data: any) => { 
      console.log('event');
    });
    client.on('disconnect', () => { 
      console.log('disconnect');
    });
  });
  server.listen(3000);
}

main();
