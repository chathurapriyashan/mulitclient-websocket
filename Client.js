const FrameDecoder  = require('./FrameDecoder');
const Handshake = require('./Handshake');

/**
 * 
 * @enum {String} communicationModes  
 */
const enumTypeCommunicationModes = {
    fullDuplex : "fullDuplex",
    halfDuplex :"halfDuplex",
    simplex :"simplex",
}


class Client{
    #socket = undefined;
    #id = undefined;
    OPEN = true;
    // #dataListeners = [];
    // #pairedWith = undefined;
    #communicationMode = 'fullDuplex';
    #onMessageCallback = [];
    #onClientSocketErrorCallback = (error , client)=>{};
    #onClientSocketEndCallback = (client)=>{};
    #onClientSocketCloseCallback = (client)=>{};
    #onSocketConnectCallback = (client)=>{};



    constructor(socket){
        try{

            this.#socket = socket;
            this.#id = Number.parseInt(Date.now() + Math.random() * 100);
            this.#socket.isHandShakeDone = false;
            
            
            this.#socket.addListener('data' , (data)=>{
                try{

                    if(!this.#socket.isHandShakeDone){
                        this.#handShake(data);
                        this.#socket.isHandShakeDone = true;
                        return;
                    }
                    const msg = FrameDecoder.decodeDataFrame(data);

                    // activate communication modes for paired Sockets
                    // if(this.#pairedWith){
                    //     this.#fullDuplexCommunication(msg , this.#pairedWith);
                    //     this.#halfDuplexCommunication(msg , this.#pairedWith);
                    //     this.#simplexCommunication(msg , this.#pairedWith);
                    // }

                    //execute post handling onMessageHandler
                    if(this.#onMessageCallback.length){
                        this.#onMessageCallback.forEach(callback => callback(msg , this));
                    }


                }catch(e){
                    console.log(e);
                }
            })
            
            this.#socket.addListener('error' , (error)=>{
                try{
                    this.#onClientSocketErrorCallback(error , this);
                }catch(e){
                    console.log(e);
                }
            })
            
            this.#socket.addListener('close' , ()=>{
                try{

                    this.#onClientSocketCloseCallback(this);
                }catch(e){
                    console.log(e);
                }
            })
            
            socket.addListener('end' , ()=>{   
                try{
                    this.#onClientSocketEndCallback(this);
                }catch(e){
                    console.log(e);
                }
                    
            }); 
        }catch(e){
            console.log(e);
        }
    }



    #handShake(data){
        if(!this.#socket.isHandShakeDone){
            const response = Handshake.createHandShakeResponse(data);
            this.#socket.write(response , ()=>{
                this.OPEN = true;
                this.#onSocketConnectCallback(this);
            });
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
     * @name write
     * @requires Buffer
     * @description this function required  Encoded Frame buffer
     * @param {Buffer} frame 
     * @returns 
     */

    write(frame , callback=()=>{}){
        try{

            this.#socket.write(frame , callback);
            return this;
        }catch(e){
            console.log(e);
            
        }
    }

    /** 
        @name read
        *@param {Frame | dataBuffer} frame  read data from buffer frame
    */
    readFrame(frame){
        try{
            const msg = FrameDecoder.decodeDataFrame(frame);
            return msg;
        }catch(e){
            console.log(e);
            
        }
    }

    /**
     * @name send
     * @description this function send string data to client from server
     * @param {*} message 
     * @returns 
     */
    send(message){
        try{
            const frames = FrameDecoder.encodeFrame(message);
            frames.forEach(f=>this.#socket.write(f));
            return this;
        }catch(e){
            console.log(e);
            
        }
    }

    onConnect(callback){
        this.#onSocketConnectCallback = callback;
    }   

    close(reason="server side disconnected"){
        try{

            const frames = FrameDecoder.encodeFrame(reason , 'close');
            frames.forEach(f=>this.#socket.write(f));
            return this;
            
        }catch(e){
            console.log(e);
        }
    }


    destroy(){
        try{

            this.#socket.destroy();
        }catch(e){
            console.log(e);
            
        }
    }

    /**
     * 
     * @param {(message : String , client : Client)=>{}} [callback=(message , client)=>{}] 
     * @returns 
     */
    onMessage(callback = this.#onMessageCallback){
        try{
            this.#onMessageCallback.push(callback);
            return this;
        }catch(e){
            console.log(e);
            
        }
   
   
    }

    onError(callback =  this.#onClientSocketErrorCallback){
        try{

            this.#onClientSocketErrorCallback = callback;
            return this;
        }catch(e){
            console.log(e);
            
        }
    }

    onEnd(callback = this.#onClientSocketEndCallback){
        try{

            this.#onClientSocketEndCallback = callback;
            return this;
        }catch(e){
            console.log(e);
            
        }
    }

    onClose(callback = this.#onClientSocketCloseCallback){
        try{
            this.#onClientSocketCloseCallback = callback;
            return this;
        }catch(e){
            console.log(e);
        }
    }

   

    setCommunicationMode(communicationMode){
        try{
            this.#communicationMode = communicationMode;
            return this;
        }catch(e){
            console.log(e);
        }
    }

    /**
     * @name getId
     * @returns {Number} id
     */
    getId(){
        try{
            return this.#id;
        }catch(e){
            console.log(e);
        }
    }

}

module.exports = Client;