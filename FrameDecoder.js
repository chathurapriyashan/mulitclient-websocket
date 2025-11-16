class FrameDecoder {
    static decodeDataFrame = (data) => {
        try {

            const array = new Uint8Array(data);
            const isMasked = (array[1] & 128) / 128;
            if (isMasked) {
                const payloadLength = array[1] - 128;
                const maskingKeyLength = 4;


                let payloadStartAt = 6;
                if (payloadLength <= 125) {
                    payloadStartAt = 6;
                } else if (payloadLength = 126) {
                    payloadStartAt = 8;
                } else if (payloadLength == 127) {
                    payloadStartAt = 10;
                }


                const maskingKey = array.slice(2, payloadStartAt);
                const payload = array.slice(payloadStartAt).map((byte, i) => {
                    return byte ^ maskingKey[i % maskingKeyLength];
                });

                return (Buffer.from(payload).toString());


            } else {
                return Buffer.from(array.slice(2)).toString();
            }
        } catch (e) {
            console.log(e);
            throw e;

        }
    };

    static encodeFrame(data, type = "text") {
        const buffer = new Uint8Array(Buffer.from(data));
        const bufferLen = buffer.length;
        const MINIMUM_BUFF_LEN = 10;


        const buffers = [];
        for (let i = 0; i < bufferLen; i += MINIMUM_BUFF_LEN) {
            buffers.push(buffer.slice(i, i + MINIMUM_BUFF_LEN));
        }




        const frames = buffers.map((payload, i) => {
            let fin = 0;
            if (i == buffers.length -1) {
                fin = 128;
            }




            // for default text
            let opcode = fin + 0;
            if (i == 0) {
                if (type == 'text') {
                    opcode = fin + 1;
                } else if (type == 'binary') {
                    opcode = fin + 2;
                }else if(type ==  'close'){
                    opcode = fin + 8;
                }
            }

            const payloadLen = payload.length;
            const frameUArray = new Uint8Array([opcode, payloadLen, ...payload]);

            return Buffer.from(frameUArray);



        });

        return frames;
    }

}
module.exports = FrameDecoder;
