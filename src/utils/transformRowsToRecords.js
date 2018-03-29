/**
 * Created by zhiyuan.huang@ddder.net.
 */

'use strict';

module.exports = function transformRowsToRecords(rowList, RecordClass) {
    let recordList = [];

    if (!Array.isArray(rowList)) {
        rowList = [rowList];
    }

    rowList.forEach(row => {
        let record = new RecordClass();
        recordList.push(record.importEntry(row));
    });

    return recordList;
};