function test(bdd, SmppParser, assert, expect, Validator, data) {
    bdd.describe('SMPP messages', function() {
        var parser = new SmppParser({});
        var encodedData = null;
        var decodedData = null;
        Object.keys(data.decodeTests).map(function(test) {
            bdd.it('#Should decode correctly: ' + test, function() {
                encodedData = parser.decode(data.decodeTests[test].buf);
                expect(encodedData).to.be.a('object');
                assert.deepEqual(encodedData, data.decodeTests[test].data);
            });
        });
        Object.keys(data.encodeTests).map(function(test) {
            bdd.it('#Should encode correctly: ' + test, function() {
                decodedData = parser.encode(data.encodeTests[test].data);
                expect(decodedData).to.be.a('object'); // buffer
                assert.equal(decodedData.toString(), data.encodeTests[test].buf.toString());
            });
        });
    });
};

test();
