var emvTagsConfig = require('./emv.tags');
var emvTagsMap = emvTagsConfig.map;
var emvLongTags = emvTagsConfig.longTags;
var emvDolNumericTypes = emvTagsConfig.dolNumericTypes;

function emvEncodeMapTags() {
    emvTagsConfig.map.encode = Object.keys(emvTagsConfig.map.decode)
        .map((e) => {
            let o = {};
            o[emvTagsConfig.map.decode[e]] = e;
            return o;
        })
        .reduce((accum, cur) => Object.assign(accum, cur), {});
}

function translateTagEncode(tag) {
    return emvTagsMap.encode[tag] || tag;
}

function translateTagDecode(tag) {
    return emvTagsMap.decode[tag.toUpperCase()] || tag;
}

function getNumVal(val, len, dolLenDiff, compressedNumeric) {
    if (dolLenDiff < 0) { // left truncated
        return val.slice(len * -2);
    } else {
        if (!compressedNumeric) {
            return ((new Array(len)).fill('00').join('') + val).slice(len * -2);
        }
        return (val + (new Array(dolLenDiff)).fill('FF').join(''));
    }
};
function getNonNumVal(val, len, dolLenDiff) {
    if (dolLenDiff < 0) { // right truncated
        return val.slice(len * 2);
    } else {
        return (val + (new Array(len)).fill('00').join('')).slice(len * 2);
    }
};

function getValueHexLength(val) {
    let len = (val.length / 2).toString(16).toUpperCase();

    return (len.length % 2) ? `0${len}` : len;
}

/**
 * @param {string} emvString emv input string
 * @param {Object} result object to store results in
 * @param {number=} dolIdx value position in data object list
 */
function tagsDecode(emvString, result, dolIdx) {
    var tag;
    var len;
    var val;
    var isDol = false;
    if (emvLongTags.indexOf(emvString.substr(0, 2).toLowerCase()) >= 0) { // 2 bytes tag
        tag = emvString.substr(0, 4);
        emvString = emvString.substr(4);
    } else {
        tag = emvString.substr(0, 2);
        emvString = emvString.substr(2);
    }
    var tagTranslated = translateTagDecode(tag);
    result[tagTranslated] = {tag};
    if (~tagTranslated.indexOf('DOL')) {
        isDol = true;
    }
    if (dolIdx) {
        result[tagTranslated].idx = dolIdx - 1;
    }
    var lenStr = emvString.substr(0, 2);
    len = (lenStr === '') ? 0 : parseInt(emvString.substr(0, 2), 16);
    emvString = emvString.substr(2);
    if (!dolIdx && len > emvString.length * 2) {
        throw new Error('Data integrity error');
    }
    if (len >= 128) { // size is big
        var byteNumSize = 0;
        var cur = 128;
        while (cur >= 1) { // calculate big size
            cur = cur >> 1;
            if ((len & cur) === cur) {
                byteNumSize = byteNumSize | cur;
            }
        }
        len = parseInt(emvString.substr(0, byteNumSize * 2), 16);
        emvString = emvString.substr(byteNumSize * 2);
    }
    result[tagTranslated].len = len;
    if (!len) {
        len = 0;
        val = '';
    } else {
        if (dolIdx) {
            val = '';
        } else {
            val = emvString.substr(0, len * 2);
            emvString = emvString.substr(len * 2);
        }
    }
    let constructedTagByte = (new Buffer(tag, 'hex')).slice(0, 1);
    if ((constructedTagByte & 32) === 32) {
        result[tagTranslated].val = (isDol ? tagsDecode(val, {}, 1) : tagsDecode(val, {}, (dolIdx ? dolIdx + 1 : dolIdx)));
    } else {
        result[tagTranslated].val = (isDol ? tagsDecode(val, {}, 1) : val);
    }
    if (emvString.length) {
        return tagsDecode(emvString, result, (dolIdx ? dolIdx + 1 : dolIdx));
    }
    return result;
};

/**
 * EMV 4.3 Book 3                              5 Data Elements and Files
 * Application Specification                   5.4 Rules for Using a Data Object List (DOL)
 * @param {Object} emvTags
 */
function dolDecode(emvTags) {
    let mainTags = Object.keys(emvTags);
    let dolTags = mainTags.filter((t) => (~t.indexOf('DOL')));
    if (dolTags.length) {
        emvTags = dolTags
            .map((t) => ({tag: t, data: emvTags[t].val, internalTags: Object.keys(emvTags[t].val)}))
            .reduce((allTags, dol) => {
                allTags[dol.tag].val = dol.internalTags.reduce((dolTags, dolInt) => {
                    let extTag = allTags[dolInt];
                    let dolTag = dolTags[dolInt];
                    if (!extTag) { // no tag found in root tags list
                        dolTags[dolInt].val = (new Array(dolTags[dolInt].len)).fill('00').join('');
                    } else if (extTag.len === dolTag.len) {
                        dolTags[dolInt].val = extTag.val;
                    } else {
                        let extNumType = emvDolNumericTypes[dolTag.tag];
                        if (extNumType === 'n') { // non numeric value
                            dolTags[dolInt].val = getNonNumVal(extTag.val, dolTag.len, dolTag.len - extTag.len, false);
                        } else if (extNumType === 'nc') { // non numeric value
                            dolTags[dolInt].val = getNonNumVal(extTag.val, dolTag.len, dolTag.len - extTag.len, true);
                        } else { // numeric value
                            dolTags[dolInt].val = getNumVal(extTag.val, dolTag.len, dolTag.len - extTag.len);
                        }
                    }
                    return dolTags;
                }, dol.data);
                return allTags;
            }, emvTags);
    }
    return emvTags;
};

function tagsEncode(data) {
    var dolOrder = ['CDOL1', 'CDOL2', 'TDOL', 'PDOL', 'DDOL'];
    let result = '';
    // transform data in dols
    data = Object.keys(data)
        .filter((k) => (~k.indexOf('DOL')))
        .map((k) => ({
            tag: k,
            data: data[k]
                .map((e) => {
                    let k = Object.keys(e).pop();
                    let tagTranslated = translateTagEncode(k);
                    return [tagTranslated, e[k]].join('');
                })
        }))
        .reduce((data, dol) => {
            data[dol.tag] = dol.data.join('');
            return data;
        }, data);

    let allTags = Object.keys(data);
    // make sure that dols are constructed in order
    let allDols = dolOrder
        .map((dol) => (~allTags.indexOf(dol) ? dol : 0))
        .filter((e) => e);
    // append dols to result
    result = allDols
        .reduce((r, dol) => {
            let tagTranslated = translateTagEncode(dol);
            let d = data[tagTranslated];
            let tagLength = getValueHexLength(d);

            return `${r}${tagTranslated}${tagLength}${d}`;
        }, '');
    // cleanup dols
    data = allDols
        .reduce((r, dol) => {
            delete r[dol];
            return r;
        }, data);
    // append all fields left to result
    return result + Object.keys(data).map((e) => {
        let tagTranslated = translateTagEncode(e);
        let tagObj = data[e];
        if (!tagObj || !tagObj.tag) {
            return '';
        }
        let tagLength = getValueHexLength(tagObj.val);

        return `${tagTranslated}${tagLength}${tagObj.val}`;
    }).join('');
}

module.exports = function() {
    if (!emvTagsConfig.map.encode) {
        emvEncodeMapTags();
    }

    return {
        tagsDecode,
        dolDecode,
        tagsEncode
    };
};
