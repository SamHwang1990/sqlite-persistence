/**
 * Created by zhiyuan.huang@ddder.net.
 */

'use strict';

const { getQueryCommandWithDatabase } = require('../../QueryCommand/index.js');
const Criteria = require('../../Criteria.js');
const stringFormat = require('../../../stringFormat.js');

const sqlParamReplacer = require('../../utils/sqlParamReplacer.js');

module.exports = {
    findLastestRecord: function*(columnName) {
        const criteria = new Criteria();

        if (columnName == null) {
            columnName = this.primaryKey;
        }

        criteria.distinct(false).orderBy(columnName).desc(true).limit(1);
        return yield this.findFirstRowWithCriteria(criteria);
    },

    findLastestRecordWithWhereCondition: function*(whereCondition, whereConditionParams,columnName) {
        const criteria = new Criteria();
        // log(whereCondition,whereConditionParams,columnName);
        if (columnName == null) {
            columnName = this.primaryKey;
        }

        criteria.whereCondition(whereCondition).whereConditionParams(whereConditionParams).distinct(false).orderBy(columnName).desc(true).limit(1);
        return yield this.findFirstRowWithCriteria(criteria);
    },

    find20RecordWithWhereCondition: function*(whereCondition, whereConditionParams,length) {
        const criteria = new Criteria();
        // log(whereCondition,whereConditionParams,length);

        criteria.whereCondition(whereCondition).whereConditionParams(whereConditionParams).distinct(false).orderBy('recordId').desc(true).limit(length);

        return yield this.findAllWithCriteria(criteria);
    },

    findAllRow: function*() {
        return yield this.findAllWithWhereCondition('', {});
    },

    findAllWithWhereCondition: function*(whereCondition, whereConditionParams, isDistinct = false) {
        const criteria = new Criteria();

        criteria.whereCondition(whereCondition).whereConditionParams(whereConditionParams).distinct(isDistinct);

        return yield this.findAllWithCriteria(criteria);
    },

    findAllWithSql: function*(sqlString, sqlParams) {
        sqlString = sqlParamReplacer(sqlString, sqlParams);

        const queryCommand = getQueryCommandWithDatabase(this.database);

        queryCommand.appendQueryPart(sqlString);

        return this.rowListParser(yield queryCommand.fetch());
    },

    findAllWithCriteria: function*(criteria) {
        const queryCommand = getQueryCommandWithDatabase(this.database);

        criteria.applyToSelectQueryCommand(queryCommand, this.tableName);

        return this.rowListParser(yield queryCommand.fetch());
    },

    findFirstRow: function*() {
        return yield this.findFirstRowWithWhereCondition('', {});
    },

    findWithPrimaryKey: function*(primaryKeyValue) {
        if (Array.isArray(primaryKeyValue)) {
            primaryKeyValue = primaryKeyValue[0];
        }

        return yield this.findFirstRowWithWhereCondition(
            stringFormat("{} IN (:primaryKeyValue)", this.primaryKey),
            {primaryKeyValue}
        );
    },

    findFirstRowWithWhereCondition: function*(whereCondition, whereConditionParams, isDistinct) {
        const criteria = new Criteria();

        criteria.whereCondition(whereCondition).whereConditionParams(whereConditionParams).distinct(isDistinct);
        criteria.limit(1);

        return yield this.findFirstRowWithCriteria(criteria);
    },

    findFirstRowWithSql: function*(sqlString, sqlParams) {
        sqlString = sqlParamReplacer(sqlString, sqlParams).replace(';', '');

        const queryCommand = getQueryCommandWithDatabase(this.database);

        queryCommand.appendFormatQueryPart("%@ ", sqlString).limit(1);

        const fetchData = yield queryCommand.fetch();
        return this.rowParser(fetchData[0]);
    },

    findFirstRowWithCriteria: function*(criteria) {
        const queryCommand = getQueryCommandWithDatabase(this.database);

        criteria.limit(1);
        criteria.applyToSelectQueryCommand(queryCommand, this.tableName);

        const fetchData = yield queryCommand.fetch();
        return this.rowParser(fetchData[0]);
    },

    countTotalRecord: function*() {
        const countResult = yield this.countWithSql("SELECT COUNT(*) as count FROM {}", this.tableName);
        return countResult[0].count;
    },

    countWithWhereCondition: function*(whereCondition, whereConditionParams) {
        const whereString = sqlParamReplacer(whereCondition, whereConditionParams);

        const countResult = yield this.countWithSql("SELECT COUNT(*) AS count FROM {tableName} WHERE {whereString};", {
            tableName: this.tableName,
            whereString
        });
        return countResult[0].count;
    },

    countWithSql: function*(sqlString, ...sqlParams) {
        const queryCommand = getQueryCommandWithDatabase(this.database);

        queryCommand.appendFormatQueryPart(sqlString, ...sqlParams);

        const fetchData = yield queryCommand.fetch();
        return fetchData;
    },

    findWithPrimaryKeys: function*(primaryKeyValueList) {
        const criteria = new Criteria();

        if (!Array.isArray(primaryKeyValueList)) {
            primaryKeyValueList = [primaryKeyValueList];
        }

        criteria.whereCondition(stringFormat("{} IN (:primaryKeyValueList)", this.primaryKey))
            .whereConditionParams({
                primaryKeyValueList
            });

        return yield this.findAllWithCriteria(criteria);
    },

    findAllWithWhereKeyValue: function*(key, value) {
        const criteria = new Criteria();

        criteria.whereCondition(stringFormat("{} = :value", key))
            .whereConditionParams({
                value
            });

        return yield this.findAllWithCriteria(criteria);
    }
};