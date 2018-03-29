/**
 * Created by zhiyuan.huang@ddder.net.
 */

'use strict';

const { getQueryCommandWithDatabase } = require('../../QueryCommand/index.js');
const Criteria = require('../../Criteria.js');
const stringFormat = require('../../../stringFormat.js');

module.exports = {
    updateRecord: function*(record) {
        let primaryKeyValue = record.getValue(this.primaryKey);
        if (!primaryKeyValue) return;
        return yield this.updateValuesWithPrimaryKey(record.exportForTable(this.columnDict), primaryKeyValue)
    },
    updateRecordList: function*(recordList) {
        for(let i = 0; i < recordList.length; ++i) {
            yield this.updateRecord(recordList[i]);
        }
    },

    updateValueWithWhereCondition: function*(key, value, whereCondition, whereConditionParams) {
        let entry = {};
        entry[key] = value;

        return yield this.updateValuesWithWhereCondition(entry, whereCondition, whereConditionParams);
    },
    updateValuesWithWhereCondition: function*(entry, whereCondition, whereConditionParams) {
        let queryCommand = getQueryCommandWithDatabase(this.database);
        return yield queryCommand.updateRow(this.tableName, entry, whereCondition, whereConditionParams).execute();
    },

    updateValuesWithPrimaryKey: function*(entry, primaryKeyValue) {
        const whereCondition = stringFormat("{} = :primaryKeyValue", this.primaryKey);
        const whereConditionParams = { primaryKeyValue };
        return yield this.updateValuesWithWhereCondition(entry, whereCondition, whereConditionParams);
    },
    updateValuesWithPrimaryKeyList: function*(entry, primaryKeyValueList) {
        if (!primaryKeyValueList || !primaryKeyValueList.length) return;

        const whereCondition = stringFormat("{} IN (:primaryKeyValueList)", this.primaryKey);
        const whereConditionParams = { primaryKeyValueList };
        return yield this.updateValuesWithWhereCondition(entry, whereCondition, whereConditionParams);
    },

    updateValuesWithWhereKey: function*(entry, key, keyValueList) {
        const whereCondition = stringFormat("{} IN (:keyValueList)", key);
        const whereConditionParams = { keyValueList };

        return yield this.updateValuesWithWhereCondition(entry, whereCondition, whereConditionParams);
    }
};