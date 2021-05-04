import EventModule from './structures/EventModule.js'
import Client from './structures/Client.js'

export default class SocketClient extends EventModule {
    /**
     *
     * @param {Main} main
     */
    constructor(main) {
        super(main);

        this.register(SocketClient, {
            name: 'socket_client'
        });
    }

    init() {
        const config = this.auth.credentials.socket;

        this.client = new Client(config);
        this.client.on('error', this.onError.bind(this));
        this.client.on('event', this.onEvent.bind(this));
        this.client.on('identify', this.onIdentify.bind(this));
        this.client.connect();

        return true;
    }

    /**
     *
     * @param {Error} error
     */
    onError(error) {
        this.log.error('SOCKET', 'Encountered an error:', error);
    }

    /**
     *
     * @param {JSON} data
     */
    onEvent(data) {
        this.emit(data.event, data);
    }

    /**
     *
     * @param {string} identifier
     */
    onIdentify(identifier) {
        this.log.info('SOCKET', 'Connected to socket server with identifier: '+ identifier);
    }
}
