const create = require('ut-error').define;

const JsonRPC = create('JsonRPC');
const InvalidJson = create('Invalid json', JsonRPC);
const InvalidVersion = create('Invalid version', InvalidJson);
const InvalidMethod = create('Invalid method', InvalidJson);
const InvalidPayload = create('Invalid payload', InvalidJson);
const InvalidMessageID = create('Invalid message id', InvalidJson);

module.exports = {
    JsonRPC,
    InvalidJson,
    InvalidVersion,
    InvalidMethod,
    InvalidPayload,
    InvalidMessageID
};
