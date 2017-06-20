'use strict';

module.exports = class JsonRpc {
    constructor({encoding = 'utf8'}) {
        this.encoding = encoding;
    }

    getId(context) {
        if (Number.isSafeInteger(context.trace + 1)) {
            return ++context.trace;
        } else {
            context.trace = 0;
            return 0;
        }
    }

    decode(msg, $meta, context) {
        const packet = msg.toString(this.encoding);
        const json = JSON.parse(packet);
        $meta.opcode = json.method;
        if (!json.id) {
            $meta.mtid = 'notification';
            return json.params || {};
        }
        $meta.trace = json.id;
        switch (['error', 'result', 'params'].find(key => key in json)) {
            case 'error':
                $meta.mtid = 'error';
                return Object.assign(Error(), json.error);
            case 'result':
                $meta.mtid = 'response';
                return json.result;
            case 'params':
                $meta.mtid = 'request';
                return json.params;
            default:
                $meta.mtid = 'notification';
                return {};
        }
    }

    encode(msg, $meta, context) {
        const json = {
            jsonrpc: '2.0',
            id: undefined,
            method: $meta.opcode,
            params: undefined,
            result: undefined,
            error: undefined
        };
        switch ($meta.mtid) {
            case 'request':
                $meta.trace = this.getId(context);
                json.id = $meta.trace;
                json.params = msg;
                break;
            case 'notification':
                json.params = msg;
                break;
            case 'response':
                json.id = $meta.trace;
                json.result = msg;
                break;
            case 'error':
                json.id = $meta.trace;
                json.error = msg;
                break;
        }
        return new Buffer(JSON.stringify(json), this.encoding);
    }
};
