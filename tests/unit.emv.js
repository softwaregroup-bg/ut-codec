var test = require('blue-tape');
var emv = require('../emv');
var emvMsg = '8C159F02069F03069F1A0295055F2A029A039C019F37049F02060000000000009F03060000000000005A090000000000000000005F3401019F360200B69F2608322566E3E44A3DEA9F2701809F090200009F33036040209F1A0206089F350114570F0000000000000000000D27056209405F2A0206089A031707189F410215579C01019F3704000015579F53015A';

test('Emv encode decode', (t) => {
    let decoded = emv.tagsDecode(emvMsg, {});
    let decodedDols = emv.dolDecode(decoded);

    let encoded = emv.tagsEncode(decoded);

    let secondaryDecoded = emv.tagsDecode(encoded, {});
    let secondaryDecodedDols = emv.dolDecode(secondaryDecoded);

    t.deepEqual(decoded, secondaryDecoded, 'ensure no data loss when encoding/decoding');
    t.deepEqual(decodedDols, secondaryDecodedDols, 'ensure no data loss when encoding/decoding with dols');

    t.end();
});
