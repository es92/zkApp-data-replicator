
import http from 'http';
import * as socketio from "socket.io";
import { io } from "socket.io-client";

export { Handler, Requester }

class Handler {
  event_table: any;

  constructor(port: number = 3000) {
    const server = http.createServer();
    const io = new socketio.Server(server);

    this.event_table = {};

    io.on('connection', (client: any) => {

      console.log('connection');

      function reply(resid: any, error: any, result: any) {
        client.emit('result', { resid, error, result });
      }

      client.on('handle', (data: any) => { 
        var name = data.name;
        var args = data.args;
        var resid = data.resid;

        if (name in this.event_table) {
          this.event_table[name](args).then((result: any) => {
            reply(resid, null, result);
          });
        } else {
          reply(resid, 'event DNE', null);
        }
      });

      client.on('disconnect', () => { 
        // TODO delete relevant resids
        console.log('disconnect');
      });
    });

    server.listen(port);
  }

  on(name: string, fn: any) {
    this.event_table[name] = fn;
  }
}

class Requester {
  socket: any;
  cb_table: any;
  next_resid: any;

  constructor(addr: any) {
    this.socket = io(addr)
    this.cb_table = {};
    this.next_resid = 0;

    this.socket.on('result', (result: any) => {
      this.cb_table[result.resid](result.error, result.result);
    });
  }

  call(name: any, args: any) {
    return new Promise((done_cb: any, error_cb: any) => {
      var resid = this.next_resid++;
      this.cb_table[resid] = (error: any, result: any) => {
        if (error != null) {
          error_cb(error);
        } else {
          done_cb(result);
        }
      };
      this.socket.emit('handle', { resid, name, args });
    });
  }
}
