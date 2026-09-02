const EventEmitter = require('events');

class AppEventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(50); // Aumentar límite de listeners
    }
}

const eventBus = new AppEventBus();

module.exports = eventBus;
