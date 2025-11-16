const net = require('node:net');
const Client = require('./Client');


class WebSocket{
    #TCPServer = undefined;
    #clients = [];
    #onClientConnectCallback = (newClient)=>{};
    #onClientDisconnectCallback = (client)=>{};
    #onClientMessageCallback = (message , client) => {};

    constructor(){
        this.#TCPServer = net.createServer((socket)=>{
            try{
                this.#addClients(socket);                
            }catch(e){
                console.log(e); 
            }
        });
    }

    #removeClient(client){
        const index = this.#clients.findIndex(client);
        this.#clients.splice(index , 1);
        this.#onClientDisconnectCallback(client);
    }

    #addClients(socket){
        const client = new Client(socket);
        client.onMessage(this.#onClientMessageCallback);
        this.#clients.push(client);
        this.#onClientConnectCallback(client);
        socket.addListener('close' , ()=>{this.#removeClient(client)});        
    }


    /**
     * 
     * @param {Function} callback function(newClient){} or async function(newClient){}
     * @returns this; websocket
     */
    onClientConnect(callback = this.#onClientConnectCallback){
       this.#onClientConnectCallback = callback;
       return this; 
    }

    /**
     * 
     * @param {Function} callback function(client){} or async function(client){} 
     * @returns this websocket
     */
    onClientDisconnect(callback = this.#onClientDisconnectCallback){
        this.#onClientDisconnectCallback = callback;
        return this;
    }


    /**
     * 
     * @param {Function} callback function (message , client){}; or async function(client){};
     * @returns this;
     */
    onClientMessage(callback=this.#onClientMessageCallback){
        this.#onClientMessageCallback = callback;
        return this;
    }

    
    getConnectedClients(options = { index, startIndex , lastIndex , length}){
        const output = {};
        for(const [key , value] of Object.entries(options)){
            if(!key) continue;
            if(key =='index') output.client = this.#clients[value];
            if(key == 'startIndex' && !options.lastIndex) output.clients = this.#clients.slice(value) ;
            if(key == 'lastIndex' && !options.startIndex) output.clients = this.#clients.slice(0 , value);
            if(key == 'length' ) output['length'] =  this.#clients.length;
        }

        if(options.startIndex && options.lastIndex) output.clients = this.#clients.slice(options.startIndex , options.lastIndex);

        return output;
    }


    /**
     * @name broadcast - send message message to all clients ,but this is simplex connection . clients can't directly reply broadcast message. server to client connection.
     * @param {String} message 
     * @param {(client: any, i: any, arr: any) => boolean} [filterFunc=(client , i , arr)=>true]  send broadcast message to selected clients;
     * @returns this - Websocket
     */
    broadcast(message , filterFunc){
        if(filterFunc){
            this.#clients.filter(filterFunc).forEach(client=> client.write(message));
        }
        this.#clients.forEach(client=> client.write(message));
        return this;
    }

    
    listen(port=8080 , address="127.0.0.1" , callback){
        try{

            this.#TCPServer.listen(port , address , callback ? callback() : ()=>{
                console.log(`tcp server started at ws://${this.#TCPServer.address().address}:${this.#TCPServer.address().port}`);
            })
            
        }catch(e){
            console.log(e);
            throw e;
            
        }
    }
}

module.exports = WebSocket;

