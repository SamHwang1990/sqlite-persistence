/**
 * Created by zhiyuan.huang@ddder.net.
 */

'use strict';

module.exports = function recordSetParser(rs) {
    if (!rs) return null;

    const count = rs.getProperty('count');
    const recordSet = rs.getProperty('recordset');
    const fieldNames = rs.getProperty('fieldNames');

    const result = [];
    let columnCount = fieldNames.getLength();
    let currentObj = null;

    for (let i = 0; i < recordSet.getLength(); ++i) {
        let v = recordSet.getAt(i);
        let indexRemainder = i % columnCount;

        if (indexRemainder === 0) {
            currentObj = {};
            result.push(currentObj);
        }

        currentObj[fieldNames.getAt(indexRemainder)] = v;
    }

    currentObj = null;
    return result;
};