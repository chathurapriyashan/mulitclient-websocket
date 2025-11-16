# Simple TCP WebSocket-like Server

This project exposes a lightweight WebSocket-like server built on top of Node's `net` module. It is a minimal wrapper around TCP sockets with a small Client abstraction.

This README documents the public API, usage examples and a few implementation notes / suggested fixes.

## Requirements
- Node.js 16+ (uses `node:net` import style)
- A `Client` class implementation at `./Client` that provides at least:
  - `onMessage(callback)` — registers a message handler
  - `write(message)` — sends a message to the client
  - The client should close the underlying socket to trigger server-side cleanup.

## Overview
The exported WebSocket class manages connected Client instances and provides these main features:
- onClientConnect(callback)
- onClientDisconnect(callback)
- onClientMessage(callback)
- getConnectedClients(options)
- broadcast(message, [filterFunc])
- listen(port, address, [callback])

All methods are chainable (they return `this`) where appropriate.

## Quick example

```js
const WebSocket = require('./WebSocket');

const ws = new WebSocket();

ws.onClientConnect(async (client) => {
  console.log('client connected', client);
  client.write('welcome');
});

ws.onClientMessage((message, client) => {
  console.log('received:', message, 'from', client);
});

ws.onClientDisconnect((client) => {
  console.log('client disconnected', client);
});

ws.listen(8080, '127.0.0.1', () => {
  console.log('server listening callback (optional)');
});
```

Notes:
- Callbacks can be synchronous or `async`.
- `client` objects are instances of the project's `Client` class (not raw sockets).

## API Reference

- onClientConnect(callback)
  - callback: function(newClient) | async function(newClient)
  - Called when a new Client is accepted.
  - Returns `this`.

- onClientDisconnect(callback)
  - callback: function(client) | async function(client)
  - Called when a Client disconnects.
  - Returns `this`.

- onClientMessage(callback)
  - callback: function(message, client) | async function(message, client)
  - Registers message handler for each new client (the internal Client's `onMessage` is used).
  - Returns `this`.

- getConnectedClients(options = {})
  - options keys:
    - index: number — return a single client as `client`.
    - startIndex: number — return clients from startIndex to end as `clients`.
    - lastIndex: number — return clients from 0 to lastIndex as `clients`.
    - startIndex & lastIndex — return slice(startIndex, lastIndex) as `clients`.
    - length: boolean — returns `{ length: <number> }`.
  - Returns an object with keys like `{ client, clients, length }`.

- broadcast(message, filterFunc)
  - message: String | Buffer
  - filterFunc: optional (client, i, arr) => boolean to select recipients
  - Sends `message` to matched clients (or all clients if no filterFunc).
  - Returns `this`.

- listen(port = 8080, address = "127.0.0.1", callback)
  - Starts the TCP server and logs the listening address if no callback provided.
  - callback is optional and will be executed once server is listening.

## Implementation notes and suggested fixes
The current implementation mostly works but contains a few bugs / oddities you may want to address in the source:

1. Removing a client
   - Current code uses `this.#clients.findIndex(client)` which does not pass a predicate. Use:
     `const index = this.#clients.findIndex(c => c === client);`

2. broadcast duplicates when filterFunc provided
   - Current implementation writes to filtered clients then writes to all clients unconditionally, resulting in duplicates. Fix by using an `else`:
     ```js
     if (filterFunc) {
       this.#clients.filter(filterFunc).forEach(c => c.write(message));
     } else {
       this.#clients.forEach(c => c.write(message));
     }
     ```

3. listen callback invocation
   - Current code calls `callback()` immediately when passing to `listen`. Pass the function instead:
     `this.#TCPServer.listen(port, address, callback ? callback : () => { ... })`

4. getConnectedClients default parameter
   - The signature `getConnectedClients(options = { index, startIndex , lastIndex , length})` is invalid as written. Prefer:
     `getConnectedClients(options = {})` and document expected keys (see API above).

5. Defensive checks
   - When removing by index, verify index >= 0 before splicing.
   - When using slices, ensure provided indices are numbers and within bounds.

6. Client contract
   - Ensure your `Client` class emits `'close'` on its underlying socket and exposes `onMessage` + `write` as used by the server.

## Troubleshooting
- If clients appear to not be removed, check the `close` listener on the socket and ensure `#removeClient` finds the right index.
- If broadcasted messages are received twice when using a filter, apply the broadcast fix above.

---

This README provides the minimal guidance to use the WebSocket wrapper and points out a few small changes to improve correctness. Feel free to ask for a patch to fix any of the suggested issues directly in the source files.
