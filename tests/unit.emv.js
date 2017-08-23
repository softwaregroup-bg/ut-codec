const test = require('blue-tape');
const emv = require('../emv');

const validEmv = {
    emvDolMsg: '8C159F02069F03069F1A0295055F2A029A039C019F37049F02060000000000009F03060000000000005A090000000000000000005F3401019F360200B69F2608322566E3E44A3DEA9F2701809F090200009F33036040209F1A0206089F350114570F0000000000000000000D27056209405F2A0206089A031707189F410215579C01019F3704000015579F53015A',
    emvConstructedTagMsg: '710A0102030405040708090A',
    emvLongLengthMsg: '5F0F8103AABBCC'
};

const invalidEmv = {
    emvConstructedTagMsgInvalidLength: {
        input: '710A0102030405060708090A',
        output: '710A0102030405040708090A'
    }
};

const integrityFailEmv = [
    '5F0F888803AABBCC',
    'qwerty'
];

test('Emv encode decode', (t) => {
    Object.keys(validEmv).forEach(k => {
        let decoded = emv.tagsDecode(validEmv[k], {});
        let decodedDols = emv.dolDecode(decoded);

        let encoded = emv.tagsEncode(decoded);

        let secondaryDecoded = emv.tagsDecode(encoded, {});
        let secondaryDecodedDols = emv.dolDecode(secondaryDecoded);

        t.deepEqual(decoded, secondaryDecoded, `ensure no data loss when encoding/decoding ${k}`);
        t.deepEqual(decodedDols, secondaryDecodedDols, `ensure no data loss when encoding/decoding ${k} with dols`);
    });

    Object.keys(invalidEmv).forEach(k => {
        let decoded = emv.tagsDecode(invalidEmv[k].input, {});
        let decodedDols = emv.dolDecode(decoded);

        let encoded = emv.tagsEncode(decoded);
        let encodedDols = emv.tagsEncode(decodedDols);

        t.deepEqual(encoded, invalidEmv[k].output, `ensure valid length calculation when encoding/decoding ${k}`);
        t.deepEqual(encodedDols, invalidEmv[k].output, `ensure valid length calculation when encoding/decoding ${k} with dols`);
    });

    integrityFailEmv.forEach(msg => {
        t.throws(() => { emv.tagsDecode(msg, {}); }, new Error('Data integrity error'), 'ensure invalid length throws error');
    });

    t.end();
});
