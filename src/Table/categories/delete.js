/**
 * Created by zhiyuan.huang@ddder.net.
 */

'use strict';

const { getQueryCommandWithDatabase } = require('../../QueryCommand/index.js');
const Criteria = require('../../Criteria.js');
const stringFormat = require('../../../stringFormat.js');

module.exports = {
    deleteRecord: function*(record) {
        let primaryKeyValue = record.getValue(this.primaryKey);
        if (primaryKeyValue == null) return;

        return yield this.deleteWithPrimaryKey(primaryKeyValue);
    },

    deleteRecordList: function*(recordList) {
        let primaryKeyValueList = [];

        recordList.forEach(record => {
            let primaryKeyValue = record.getValue(this.primaryKey)
            primaryKeyValue && primaryKeyValueList.push(primaryKeyValue);
        });

        return yield this.deleteWithPrimaryKeyList(primaryKeyValueList);
    },

    deleteWithWhereCondition: function*(whereCondition, whereConditionParams) {
        let criteria = new Criteria();
        criteria.whereCondition(whereCondition).whereConditionParams(whereConditionParams);

        return yield this.deleteWithCriteria(criteria);
    },

    deleteWithCriteria: function*(criteria) {
        const queryCommand = getQueryCommandWithDatabase(this.database);

        return yield criteria.applyToDeleteQueryCommand(queryCommand, this.tableName).execute();
    },

    deleteWithPrimaryKey: function*(primaryKeyValue) {
        let criteria = new Criteria();
        criteria.whereCondition(stringFormat("{} = :primaryKeyValue", this.primaryKey)).whereConditionParams({
            primaryKeyValue
        });

        yield this.deleteWithCriteria(criteria);
    },

    deleteWithPrimaryKeyList: function*(primaryKeyValueList) {
        if (!primaryKeyValueList || !primaryKeyValueList.length) return;

        let criteria = new Criteria();
        criteria.whereCondition(stringFormat("{} IN (:primaryKeyValueList)", this.primaryKey)).whereConditionParams({
            primaryKeyValueList
        });

        yield this.deleteWithCriteria(criteria);
    }
};