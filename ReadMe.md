# socket — Minimal TCP WebSocket-like Server

A lightweight, minimal WebSocket-like TCP server built on Node's `net` module. This package provides a thin wrapper that manages Client instances and exposes an easy-to-use API for accepting clients, receiving messages, broadcasting, and tracking connected clients.

This README documents package intent, installation, usage examples, full API, internals, recommended fixes, and troubleshooting notes.

---

## Table of contents
- About
- Requirements
- Installation
- Quick start
- Full API
- Client contract
- Client API — full list (recommended)
- Communication modes: simplex, half‑duplex, full‑duplex
- Examples
- Internals & implementation notes
- Troubleshooting
- Contribution
- License

---

## About
This package is intended as a small building block for simple TCP-based messaging where a full WebSocket or HTTP upgrade is not required. It provides:
- lifecycle hooks for client connect/disconnect
- per-client message handling via a Client abstraction
- utilities to list clients and broadcast messages

It is not a standards-compliant WebSocket server — the name signals ease-of-use rather than protocol conformance.

## Requirements
- Node.js 16+ (uses `node:net` import style)
- A `Client` class located at `./Client` in the same project. See "Client contract" below.

## Installation
This repository is intended to be used as a local module. To use it in your project:
1. Copy the module files into your project folder (or use npm if published).
2. Ensure a compatible `Client` class exists at `./Client`.

## Quick start

```js
const WebSocket = require('./WebSocket'); // path to the module in this repo

const server = new WebSocket();

server
  .onClientConnect(client => {
    console.log('client connected', client.getId());
    client.send('welcome to Server :)');
  })
  .onClientMessage((message, client) => {
    console.log('message from', client.getId());
    client.send("hi this is from server");
  })
  .onClientDisconnect(client => {
    console.log('client disconnected', client.getId());
  });

server.listen(8080, '127.0.0.1', () => {
  console.log('server started');
});
```

## Full API

- new WebSocket()
  - Creates a server manager. Uses Node's `net.createServer` internally.

- onClientConnect(callback)
  - callback signature: (newClient) => void | Promise<void>
  - Called when a new client connects. Returns `this` for chaining.

- onClientDisconnect(callback)
  - callback signature: (client) => void | Promise<void>
  - Called when a client disconnects. Returns `this`.

- onClientMessage(callback)
  - callback signature: (message, client) => void | Promise<void>
  - Registered on each new client via the Client abstraction. Returns `this`.

- getConnectedClients(options = {})
  - options:
    - index (number) — returns a single client as `client`
    - startIndex (number) — returns `clients` from startIndex to end
    - lastIndex (number) — returns `clients` from 0 to lastIndex
    - startIndex & lastIndex — returns slice(startIndex, lastIndex)
    - length (boolean) — include `{ length: <number> }` in return value
  - Returns an object containing one or more of `{ client, clients, length }`.

- broadcast(message, filterFunc)
  - message: String | Buffer
  - filterFunc (optional): (client, i, arr) => boolean
  - Sends `message` to matched clients (or all clients if no filter). Returns `this`.

- listen(port = 8080, address = "127.0.0.1", callback)
  - Starts the underlying TCP server. If `callback` is provided, it is passed as the listen callback. Otherwise a default console log is used.

## Client contract
The package depends on a `Client` abstraction. The concrete `Client` must provide:

- constructor(socket)
  - Accepts a Node `net.Socket` and sets up internal handlers.

- onMessage(callback)
  - Registers a handler for incoming messages on that client. The server calls `client.onMessage(this.#onClientMessageCallback)` for each client when accepted.

- write(message)
  - Sends a message to the client. Accepts Buffer or string.

- The `Client` must ensure its underlying socket emits a `'close'` event (typical for `net.Socket`) so the server can remove the client when disconnected.

Example minimal Client shape:

```js
// pseudo-code (not part of this repo)
class Client {
  constructor(socket) {
    this.socket = socket;
    this.socket.on('data', chunk => { /* parse message and call handlers */ });
    this.socket.on('close', () => { /* emit close so server can remove */ });
  }
  onMessage(cb) { /* register cb */ }
  write(data) { this.socket.write(data); }
}
```

## Client API — full list (recommended)
Below is a recommended full method/property surface for the Client abstraction so it supports common patterns and the communication modes described later.

- constructor(socket)
  - Initialize internal state, attach socket handlers.

- id (string|number)
  - Optional identifier for the client (set by server or Client).

- socket (net.Socket)
  - Underlying socket instance.

- onMessage(cb)
  - Register a handler invoked with (message, client). Multiple handlers allowed.

- offMessage(cb)
  - Remove a previously registered message handler.

- write(data)
  - Low-level send. Accepts Buffer | string.

- send(data)
  - Alias for write — may include framing / encoding helper.

- close([code, reason])
  - Close underlying socket gracefully.

- onClose(cb)
  - Register a handler for close events.

- onError(cb)
  - Register handler for socket errors.

- paused (boolean) / pause() / resume()
  - Optional helpers to control reading if implementing half‑duplex flow control.

- metadata (object)
  - Free-form storage for application data (e.g., role, auth).

These methods are suggestions to make clients easy to use with the server. The server only requires onMessage, write, and that the socket emits 'close', but many apps benefit from the extended surface above.

## Communication modes: simplex, half‑duplex, full‑duplex

This project can be used in different communication modes depending on how you structure reads/writes and semantics. The underlying TCP socket is inherently full‑duplex, but your application protocol can implement simplex or half‑duplex semantics.

1. Simplex (server → client only)
   - Description: Messages flow in one direction only (server to client). Clients typically do not send data back or server ignores inbound data.
   - Use case: server broadcasting telemetry, notifications, or fire‑and‑forget updates.
   - Server example:
     ```js
     // send to all connected clients (no replies expected)
     server.broadcast('server: event happened');
     ```
   - Client requirements: implement write/to receive and ignore or drop client-originated messages.

2. Half‑duplex (one direction at a time)
   - Description: Both sides can send, but only one side transmits at any given time. Requires protocol-level coordination (e.g., request/response, token passing).
   - Use case: legacy or constrained devices that must alternate send/receive.
   - Simple pattern (request/response):
     - Server sends a request and waits for reply before sending next request to that client.
   - Server example pattern:
     ```js
     // pseudo-code: send request and expect a single reply from client
     async function requestAndWait(client, request, timeout = 5000) {
       return new Promise((resolve, reject) => {
         const onMsg = (msg, c) => {
           if (c === client) {
             client.offMessage(onMsg);
             resolve(msg);
           }
         };
         client.onMessage(onMsg);
         client.write(request);
         setTimeout(() => {
           client.offMessage(onMsg);
           reject(new Error('timeout'));
         }, timeout);
       });
     }
     ```
   - Client behavior: after receiving a request, send a response and then wait for the next request.

3. Full‑duplex (bidirectional concurrently)
   - Description: Both server and client may independently send messages at any time. This is the default behavior provided by TCP sockets.
   - Use case: chat apps, streaming, interactive apps.
   - Server example:
     ```js
     server.onClientMessage((message, client) => {
       console.log('received', message.toString());
       // server may also write back at any time
       client.write('ack: ' + message.toString());
     });

     // server can also push unsolicited messages
     setInterval(() => server.broadcast('heartbeat'), 10000);
     ```
   - Client example:
     - Client listens for server pushes and also sends messages when needed.

Notes:
- Implementing half‑duplex semantics requires cooperative protocol rules between client and server (e.g., sequence numbers, explicit "ready" messages, or token passing).
- Even when you intend simplex or half‑duplex, the underlying socket remains full‑duplex; you must ensure your application ignores or buffers unexpected messages appropriately.

## Examples

- Echo server: See Quick start — server echos messages back.
- Broadcast to everyone:
  server.broadcast('server message');
- Broadcast to subset:
  server.broadcast('hello admins', client => client.role === 'admin');

## Internals & implementation notes
The current code is intentionally small; a few practical caveats and suggested fixes:

- Client removal
  - Ensure removal uses a predicate when searching index:
    const index = this.#clients.findIndex(c => c === client);
  - Check index >= 0 before splicing.

- broadcast implementation
  - Avoid duplicate sends when filterFunc is provided. Use an if/else to choose filtered list or all clients.

- listen callback
  - Do not call `callback()` when passing it to `listen`. Pass the function itself:
    this.#TCPServer.listen(port, address, callback ? callback : () => {...})

- getConnectedClients default
  - Use `getConnectedClients(options = {})` rather than an object literal with undefined keys.

- Defensive programming
  - Validate option types (numbers) and bounds when slicing arrays.

## Troubleshooting

- Duplicate messages on broadcast:
  - Verify broadcast implementation does not send twice when filterFunc is present.

- Clients not removed after disconnect:
  - Confirm the Client forwards socket 'close' events and that #removeClient uses a proper index lookup.

- Listen callback not executed:
  - Ensure you pass the callback function to server.listen instead of calling it immediately.

## Contribution
Contributions and fixes are welcome. Suggested small tasks:
- Add tests for client lifecycle and broadcast behavior.
- Implement stronger type checks for getConnectedClients.
- Add logging/hooks for socket errors and message parsing issues.

When opening a PR:
- Include tests and a short description of the change.
- Keep API backward compatible or document breaking changes.

## License
Add your preferred license (e.g., MIT) or include LICENSE file at repo root.

---

If you want, I can:
- Apply the suggested bugfixes directly to the WebSocket implementation.
- Create a minimal Client implementation for local testing.
- Add unit tests and example scripts in this repository.

