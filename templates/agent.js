export class Agent {
    /**
     * @param {string} name - Name of the agent.
     */
    constructor(name) {
        this._name = name;
    }

    /**
     * Get the name of the agent.
     * @returns {string}
     */
    get name() {
        return this._name;
    }

    set name(name) {
        this._name = name;
    }

    /**
     * Abstract method to send a message to another agent.
     * @param {(Object|string)} message 
     * @param {Agent} recipient 
     * @param {boolean|null} [requestReply=null]
     */
    send(message, recipient, requestReply = null) {
        throw new Error('Abstract method not implemented');
    }

    /**
     * Abstract method to receive a message from another agent.
     * @param {(Object|string)} message 
     * @param {Agent} sender 
     * @param {boolean|null} [requestReply=null]
     */
    receive(message, sender, requestReply = null) {
        throw new Error('Abstract method not implemented');
    }

    /**
     * Abstract method to reset the agent.
     */
    reset() {
        throw new Error('Abstract method not implemented');
    }

    /**
     * Abstract method to generate a reply based on the received messages.
     * @param {Array<Object>} [messages=[]] 
     * @param {Agent|null} [sender=null] 
     * @param  {...any} args 
     * @returns {(string|Object|null)}
     */
    reply(messages = [], sender = null, ...args) {
        throw new Error('Abstract method not implemented');
    }
}