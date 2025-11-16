const net = require('node:net');
const Client = require('./Client');
const FullDuplexConnection = require('./connections/FullDuplexConnection');
const HalfDuplexConnection = require("./connections/HalfDuplexConnection");
const SimplexConnection = require("./connections/SimplexConnection");


class WebSocket{
    #TCPServer = undefined;
    #clients = [];
    #onClientConnectCallback = (newClient)=>{};
    #onClientDisconnectCallback = (client)=>{};
    #onClientMessageCallback = (message , client) => {};
    #onClientSocketErrorCallback = (error , client) => {};
    #onClientSocketEndCallback = (client)=>{}

    constructor(){
        this.#TCPServer = net.createServer((socket)=>{
            try{
                this.#addClients(socket);                
            }catch(e){
                console.log(e); 

            }
        });
    }

    #addClients(socket){
        const client = new Client(socket);
        client.onMessage(this.#onClientMessageCallback);
        client.onError(this.#onClientSocketErrorCallback);
        client.onEnd(this.#onClientSocketEndCallback);
        client.onClose(this.#onClientDisconnectCallback);
        client.onConnect(this.#onClientConnectCallback);

        this.#clients.push(client);
        return client;
        
   
    }


    #removeClient(client){
        this.#clients = this.#clients.filter(client)

    }
    /**
     * 
     * @param {(error : Error , client : Client) => this} callback 
     * @returns this
     */
    onClientSocketError(callback = this.#onClientSocketErrorCallback){
        this.#onClientSocketErrorCallback = (client)=>{
            callback(client);
        };
        return this;
    }

    /**
     * 
     * @param {(client : Client)=>this} callback 
     * @returns 
     */
    onClientSocketEnd(callback = this.#onClientSocketEndCallback){
        this.#onClientSocketEndCallback = callback;
        this.#clients = this.#clients.filter(c=> c != client);

        return this;
    }


    /**
     * 
     * @param {(newClient : Client)=>this} callback function(newClient){} or async function(newClient){}
     * @returns this; websocket
     */
    onClientConnect(callback = this.#onClientConnectCallback){
       this.#onClientConnectCallback = (client)=>{
            callback(client);
       };
       return this; 
    }

    /**
     * 
     * @param {(client : Client)=>this} callback function(client){} or async function(client){} 
     * @returns this websocket
     */
    onClientDisconnect(callback = this.#onClientDisconnectCallback){
        this.#onClientDisconnectCallback = (client)=>{
            callback(client);
            this.#removeClient(client);
        }
        return this;
    }

    /**
     * 
     * @param {(message : String , client : Client)=>this} callback function (message , client){}; or async function(client){};
     * @returns this;
     */
    onClientMessage(callback=this.#onClientMessageCallback){
        this.#onClientMessageCallback = callback;
        return this;
    }

    /**
     * 
     * @param {{index ?: number , startIndex ?: number , lastIndex ?: number}} [options={index , startIndex , lastIndex}] 
     * @param {(client:Client , i :number , arr : Client[])=> Boolean} [filterFunc=(client , i , arr)=>{}]
     * @returns {{clients : Client[], client : Client,length : number}} [output={}]
     *  
     * 
     */
    getConnectedClients(options = { index : undefined, startIndex : undefined , lastIndex :undefined }, filterFunc){
        let output = {
            clients: this.#clients,
            client: undefined,
            length : this.#clients.length,
        };
        
        for(const [key , value] of Object.entries(options)){
            if(!value) continue;
            if(key =='index') output.client = this.#clients[value];
            if(key == 'startIndex' && !options.lastIndex) output.clients = this.#clients.slice(value) ;
            if(key == 'lastIndex' && !options.startIndex) output.clients = this.#clients.slice(0 , value);
        }

        if(options.startIndex && options.lastIndex) output.clients = this.#clients.slice(options.startIndex , options.lastIndex);

        if(filterFunc){
            output = output instanceof Array ? output.filter(filterFunc) : output;
        }

        return output;
    }


    /**
     * @name broadcast - send message message to all clients ,but this is simplex connection . clients can't directly reply broadcast message. server to client connection.
     * @param {String} message 
     * @param {(client: Client, i: Number, arr: Array[Client]) => boolean} [filterFunc=(client , i , arr)=>true]  send broadcast message to selected clients;
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


    fullDuplexConnection(clients){
        const connection = new FullDuplexConnection(clients);
        return connection;
    }

    halfDuplexConnection(clients){
        const connection = new HalfDuplexConnection(clients);
        return connection;
    }

    simplexConnection(announcer , broadcastList){
        const connection = new SimplexConnection(announcer , broadcastList);
        return connection;
    }
}

module.exports = WebSocket;

