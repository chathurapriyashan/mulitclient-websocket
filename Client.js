const FrameDecoder  = require('./FrameDecoder');
const Handshake = require('./Handshake');

class Client{
    #socket = undefined;
    #id = undefined;
    #dataListeners = [];
    #pairedWith = undefined;
    #communicationMode = 'fullDuplex';
    #onMessageCallback = (message , client)=>{}

    constructor(socket){
        this.#socket = socket;
        this.#id = Number.parseInt(Date.now() + Math.random() * 100);
        this.#socket.isHandShakeDone = false;


        this.#socket.addListener('data' , (data)=>{
            if(!this.#socket.isHandShakeDone){
                this.#handShake(data);
                this.#socket.isHandShakeDone = true;
                return;
            }

            const msg = FrameDecoder.decodeDataFrame(data);
            this.#onMessageCallback(msg , this);
        })
    }

    getId(){
        return this.#id;
    }

    #handShake(data){
        if(!this.#socket.isHandShakeDone){
            const response = Handshake.createHandShakeResponse(data);
            this.#socket.write(response);
        }
    }

    /**
     * @name socket
     * @returns socket - TCP connection between client and server
     */
    socket(){
        return this.#socket;
    }

    /**
     * 
     * @param {*} data 
     * @returns 
     */
    write(data){
        this.#socket.write(data);
        return this;
    }

    /** 
        @name read
        *@param {Frame | dataBuffer} frame  read data from buffer frame
    */
    readFrame(frame){
        const msg = FrameDecoder.decodeDataFrame(frame);
        return msg;
    }

    send(message){
        const frames = FrameDecoder.encodeFrame(message);
        frames.forEach(f=>this.#socket.write(f));
        return this;
    }


    onMessage(callback = this.#onMessageCallback){
        this.#onMessageCallback = callback;
        return this;
    }

    /**
     * @name pairWith
     * @param {Client} client 
     * @param {String} communicationMode 'fullDuplex' or 'halfDuplex' or 'simplex'
     * @description 
     *  this function creates direct connection with another client
     *  there are several communication modes
     *      - fullDuplex - current client and pairedClient can communicate using same channel with both direction same time  channel
     *      - halfDuplex - current client and pairedClient can communicate using same channel with both direction, but they can't communicate same time , one client have to wait until other one finished communication.
     *      - simplex - current client and pairedClient can communicate only one direction , that means current Client can send messages , but can't read , and paired client can read messages but can send messages.
     * @returns this client
     */
    pairWith(pairedClient , communicationMode = 'fullDuplex' , callback=(pairedClient , currentClient)=>{}){
        this.#pairedWith = pairedClient;
        this.setCommunicationMode(communicationMode);
        return this;
    }

    disconnectPairedClient(callback= (pairedClient)=>{}){
        this.#pairedWith = undefined;
        callback(this.pairWith);
        return this;
    }

    /** 
     * @name setCommunicationMode
     * @param {String} communicationMode 'fullDuplex' or 'halfDuplex' or 'simplex'
     * @description 
     *  this function creates direct connection with another client
     *  there are several communication modes
     *      - fullDuplex - current client and pairedClient can communicate using same channel with both direction same time  channel
     *      - halfDuplex - current client and pairedClient can communicate using same channel with both direction, but they can't communicate same time , one client have to wait until other one finished communication.
     *      - simplex - current client and pairedClient can communicate only one direction , that means current Client can send messages , but can't read , and paired client can read messages but can send messages.
     * @returns this client
    */

    setCommunicationMode(){
        this.#communicationMode = communicationMode;
        return this;
    }




}

module.exports = Client;