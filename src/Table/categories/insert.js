/**
 * Created by zhiyuan.huang@ddder.net.
 */

'use strict';

const { getQueryCommandWithDatabase } = require('../../QueryCommand/index.js');
const Transaction = require('../../Transaction.js');

module.exports = {
    insertRecord: function*(record) {
        let queryCommand = getQueryCommandWithDatabase(this.database);
        let recordValues = record.exportForTable(this.columnDict);

        let [rowsChanged, lastRowId] = yield queryCommand.insertRow(this.tableName, recordValues).execute();
        if (rowsChanged > 0 && this.primaryKey) {
            record.setValue(this.primaryKey, lastRowId);
        }
    },
    insertRecordList: function*(recordList) {
        let queryCommand = getQueryCommandWithDatabase(this.database);

        let insertList = [];
        recordList.forEach(record => {
            insertList.push(record.exportForTable(this.columnDict));
        });
        
        const self = this;

        try {
            yield this.database.transaction(function*() {
                let [_, lastRowId] = yield queryCommand.insertRow(self.tableName, insertList).execute();

                if (typeof lastRowId === 'number') {
                    let recordListLength = recordList.length;

                    recordList.forEach((record, i) => {
                        if (record.getValue(self.primaryKey)) return;
                        record.setValue(self.primaryKey, lastRowId - recordListLength + i + 1);
                    });
                }
            });
        } catch(e) {
            log('upsert record list failed');
        }
    },

    upsertRecord: function*(record, upsertCb) {
        let queryCommand = getQueryCommandWithDatabase(this.database);
        let recordValues = record.exportForTable(this.columnDict);

        let [rowsChanged, lastRowId] =
            yield queryCommand.upsertRow(
                this.tableName,
                recordValues,
                Object.keys(this.columnDict),
                this.primaryKey).execute();

        if (upsertCb) {
            upsertCb(rowsChanged, record.getValue(this.primaryKey) == null ? lastRowId : record.getValue(this.primaryKey));
        } else if (rowsChanged > 0 && this.primaryKey && record.getValue(this.primaryKey) == null) {
            record.setValue(this.primaryKey, lastRowId);
        }
    },

    upsertRecordList: function*(recordList) {
        if (!Array.isArray(recordList)) {
            recordList = [recordList];
        }

        if (!this.database) return;
        const self = this;

        const primaryKeyValueList = [];

        try {
            yield this.database.transaction(function*() {
                for (let i = 0; i < recordList.length; ++i) {
                    yield self.upsertRecord(recordList[i], function(rowsChanged, primaryKeyValue) {
                        primaryKeyValueList.push(primaryKeyValue);
                    });
                }
            });

            for (let i = 0; i < recordList.length; ++i) {
                recordList[i].setValue(self.primaryKey, primaryKeyValueList[i]);
            }
        } catch(e) {
            log('upsert record list failed');
        }
    }
};