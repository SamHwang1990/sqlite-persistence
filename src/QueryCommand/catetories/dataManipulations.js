/**
 * Created by zhiyuan.huang@ddder.net.
 */

'use strict';

const { safeMetaString, safeSqlEncode: encode } = require('../../utils/safeSql.js');
const stringFormat = require('../../../stringFormat.js');

module.exports = {
    insertRow: function(tableName, columnInfoList) {
        this.resetQueryCommand();

        tableName = safeMetaString(tableName);

        if (!tableName || !columnInfoList) return this;

        if (!Array.isArray(columnInfoList)) {
            columnInfoList = [columnInfoList];
        }

        this.appendQueryPart(columnInfoList.map(columnInfo => {
            let columnNameList = [];
            let columnValueList = [];

            Object.keys(columnInfo).forEach(name => {
                let columnValue = columnInfo[name];

                if (columnValue === undefined) return;

                if (columnValue === null) {
                    columnValue = 'NULL';
                } else {
                    columnValue = stringFormat("'{}'", encode(columnValue));
                }

                columnNameList.push(name);
                columnValueList.push(columnValue);
            });

            return stringFormat(
                'INSERT INTO `{}` ({}) VALUES ({});',
                tableName, columnNameList.map(name => safeMetaString(name)).join(','), columnValueList.join(','));
        }).join(''));

        return this;
    },
    updateRow: function(tableName, columnsData, condition, conditionParams) {
        this.resetQueryCommand();

        tableName = safeMetaString(tableName);

        if (!tableName || !columnsData) return this;

        let values = [];
        Object.keys(columnsData).forEach(name => {
            let value = columnsData[name];
            values.push(stringFormat('`{}`=\'{}\'', safeMetaString(name), value == undefined ? 'NULL' : encode(value)));
        });

        if (!values.length) return this;
        this.appendFormatQueryPart('UPDATE `{}` SET {} ', tableName, values.join(','))
            .where(encode(condition), conditionParams);

        return this;
    },

    // upsert 语句实现参考自：https://stackoverflow.com/a/7511635/2778744
    upsertRow: function(tableName, rowData, columnNameList, primaryKey) {
        this.resetQueryCommand();

        tableName = safeMetaString(tableName);

        if (!tableName || !columnNameList || !rowData) return this;

        if (!primaryKey) primaryKey = columnNameList[0];

        let primaryValue = (rowData[primaryKey] == null ? 'NULL' : ("'" + encode(rowData[primaryKey])) + "'");

        let columnValueList = [];
        columnNameList.forEach(name => {
            let columnValue = rowData[name];

            if (columnValue === undefined) return columnValueList.push('`' + name + '`');

            columnValue = columnValue === null ? 'NULL' : ("'"+ encode(columnValue) +"'");

            columnValueList.push(columnValue);
        });

        this.appendFormatQueryPart(
            'INSERT OR REPLACE INTO `{}` ({}) SELECT {} FROM ( SELECT NULL ) LEFT JOIN ( SELECT * FROM {} WHERE `{}` = {} )',
            tableName, columnNameList.join(','), columnValueList.join(','), tableName, primaryKey, primaryValue
            );
        return this;
    },
    deleteRow: function(tableName, condition, conditionParams) {
        this.resetQueryCommand();

        tableName = safeMetaString(tableName);

        if (!tableName) return this;

        this.appendFormatQueryPart('DELETE FROM `{}` ', tableName)
            .where(encode(condition), conditionParams);

        return this;
    }
};