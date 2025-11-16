const Client = require('../Client');

class HalfDuplexConnection{
    /**
     * @type {Client[]}
     */
    #clients = [];


    /**
     * @param {Client[]} clients 
     */
    constructor(clients){
        this.#clients = clients;
    }


    openCommunicationChannels(){
        this.#clients.forEach((client , clientIndex)=>{
            client.onMessage(message=>{
                const others = this.#clients.filter((_ , otherClientIndex)=> clientIndex != otherClientIndex);
                others.forEach(otherClient=>otherClient.send(message));
                
            })
        })

    }

    closeCommunicationChannels(){
        this.#clients.forEach((client)=>{
            client.close();
        })
    }


}

module.exports = HalfDuplexConnection;