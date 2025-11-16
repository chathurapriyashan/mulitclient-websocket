const Client = require('../Client');

class SimplexConnection{
    /**
     * @type {Client}
     */
    #announcer = undefined;
    /**
     * @type {Client[]}
     */
    #broadcastList = [];


    /**
     * @param {Client[]} clients 
     */
    constructor(announcer , broadcastList){
        this.#announcer = announcer;
        this.#broadcastList = broadcastList;
    }


    openCommunicationChannels(){
        this.#announcer.onMessage(message=>{
            this.#broadcastList.forEach(client=>{
                client.send(message);
            })
        })
    }

    closeCommunicationChannels(){
        [this.#announcer , ...this.#broadcastList].forEach((client)=>{
            client.close();
        })
    }


}

module.exports = SimplexConnection;