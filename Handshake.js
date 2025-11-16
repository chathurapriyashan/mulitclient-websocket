const crypto = require('crypto');
class Handshake {
    static MAGIC_STRING = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

    static createHandShakeResponse(data) {
        const key = this.#extractSecretKey(data);
        const acceptKey = this.#generateAcceptKey(key);
        if (acceptKey) {
            const response = "HTTP/1.1 101 Switching Protocols\r\n" +
                "Upgrade: websocket\r\n" +
                "Connection: Upgrade\r\n" +
                `Sec-WebSocket-Accept: ${acceptKey}\r\n` +
                "\r\n";

            return response;
        }

    }



    static #extractSecretKey(data) {
        try {

            const req = data.toString();
            const websocketKey = req.match(/Sec-WebSocket-Key: (.*?)\r\n/s);

            if (websocketKey) {
                const key = websocketKey[1];
                return key;

            } else {
                return undefined;
            }
        } catch (e) {
            console.log(e);
            throw e;

        }

    }

    static #generateAcceptKey(key) {
        try {
            const acceptKey = crypto.createHash('sha1').update(key + Handshake.MAGIC_STRING).digest('base64');
            return acceptKey;
        } catch (e) {
            console.log(e);
            throw e;

        }
    }
}


module.exports = Handshake;
