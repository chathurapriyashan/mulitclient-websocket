const Client = require("../Client");

class FullDuplexConnection{
    /**
     * @type {Client[]}
     */
    #clients = [];
    /**
     * @param  {Client[]} clients 
     */
    constructor(clients){
        this.#clients = clients;
    }


    async openCommunicationsChannels(){
        try{
            if(this.#clients.length < 2) throw new Error('to create communication  , has to be at least 2 connections');

            this.#clients.forEach(async (client , i , clients)=>{
                client.onMessage((message)=>{ 
                    const otherClients =  clients.filter((_ , index)=> index != i);
                    otherClients.forEach(otherClient=>otherClient.send(message));
                })
            })
            
        }catch(e){
            console.log(e);
        }
    }


    async closeCommunicationChannels(){
        try{
            this.#clients.forEach(client=>{
                client.close();
            })
        }catch(e){
            console.log(e);
        }
    }

    /**
     * 
     * @param {String} message 
     */
    async broadcast(message){
        try{
            if(!message) throw new Error("can't sent empty messages");
            
            this.#clients.forEach(client=>{
                client.send(message)
            })
        }catch(e){
            console.log(e);
        }
    }
}


module.exports = FullDuplexConnection;