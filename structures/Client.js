import net from 'net'
import { v4 as uuidv4 } from 'uuid'
import { OPCode } from '../util/Constants.js'

export default class Client extends net.Socket {
    _disconnect = false;
    _id = null;
    _ready = false;
    _ping = 6e4;

    constructor(config) {
        super();

        this.config = { host: config.host, port: config.port };
        this.group = config.group;
        this.token = config.token;
    }

    get id() {
        return this._id;
    }

    get ready() {
        return this._ready;
    }

    connect() {
        this.on('close', this.onClose.bind(this));
        this.on('ready', this.onConnect.bind(this));
        this.on('data', this.onData.bind(this));

        this.reconnect();
    }

    disconnect(reason = 'NO_REASON') {
        this._ready = false;

        this.sendPayload('DISCONNECT', reason);

        this.destroy();
    }

    /**
     *
     * @param {JSON} data
     */
    handle(data) {
        switch (data.op) {
            case OPCode.EVENT:
                this.emit('event', data);

                break;
            case OPCode.IDENTIFY:
                this.identify(data);

                break;
            case OPCode.DISCONNECT:
                this.disconnect();

                break;
            case OPCode.PING:
                this.pong();

                break;
            case OPCode.PONG:
                this.resetTimeout();

                break;
        }
    }

    identify(data) {
        this._id = data.data.id;
        this._ping = data.data.ping * 2;

        this.emit('identify', data.data.id);

        this.resetTimeout();
    }

    onClose(hadError) {
        this._ready = false;

        setTimeout(this.reconnect.bind(this), 15e3);
    }

    onConnect() {
        this._ready = true;

        this.sendPayload('IDENTIFY', { group: this.group, token: this.token });
    }

    /**
     *
     * @param {Buffer} data
     */
    onData(data) {
        if (data.length > (1024 * 32)) return this.disconnect('MESSAGE_TOO_BIG');
        const msg = data.toString();

        try {
            this.handle(JSON.parse(msg));
        } catch (error) {}
    }

    ping() {
        this.sendPayload('PING');
    }

    pong() {
        this.sendPayload('PONG');

        this.resetTimeout();
    }

    reconnect() {
        super.connect(this.config);
    }

    /**
     *
     * @param {boolean} [reset=false] If the timeout should be killed permanently
     */
    resetTimeout(reset = false) {
        clearTimeout(this._timeout);

        if (reset) {
            this._disconnect = false;
            this.disconnect('PING_TIMEOUT');

            return;
        }

        this._timeout = setTimeout(() => {
            if (this._disconnect) return this.resetTimeout(true);

            this._disconnect = true;
            this.ping();
        }, 3e4 * 2);
    }

    /**
     *
     * @param {JSON} data
     * @returns {boolean}
     */
    send(data) {
        if (this.readyState !== 'open') return false;
        if (data.op === OPCode.EVENT) data.id = uuidv4();

        this.write(JSON.stringify(data));

        return true;
    }

    /**
     *
     * @param {string} opcode String identifier of the OPCode to send
     * @param {string} event Friendly name for an event
     * @param {JSON} data Data to send with the event
     * @param {{
     *  target: string,
     *  identifier: string
     * }} intent Target to send this to
     */
    sendPayload(opcode, data = undefined, event = undefined, intent = undefined) {
        this.send({
            op: OPCode[opcode],
            event,
            data,
            intent
        });
    }
}
