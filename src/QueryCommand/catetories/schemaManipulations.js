/**
 * Created by zhiyuan.huang@ddder.net.
 */

'use strict';

const { safeMetaString, safeSqlEncode: encode } = require('../../utils/safeSql.js');
const stringFormat = require('../../../stringFormat.js');

module.exports = {
    createTable: function(tableName, columnInfos) {
        this.resetQueryCommand();

        tableName = safeMetaString(tableName);
        if (!tableName) return this;

        const columns = [];
        Object.keys(columnInfos).forEach(key => {
            let description = columnInfos[key];

            if (!description) {
                columns.push(stringFormat("`{}`", safeMetaString(key)));
            } else {
                columns.push(stringFormat("`{}` {}", safeMetaString(key), description));
            }
        });

        return this.appendFormatQueryPart("CREATE TABLE IF NOT EXISTS `{}` ({});", tableName, columns.join(','));
    },

    dropTable: function(tableName) {
        this.resetQueryCommand();

        tableName = safeMetaString(tableName);
        if (!tableName) return this;

        return this.appendFormatQueryPart("DROP TABLE IF EXISTS `{}`;", tableName);
    },

    addColumn: function(tableName, columnName, columnInfo) {
        this.resetQueryCommand();

        tableName = safeMetaString(tableName);
        columnName = safeMetaString(columnName);
        columnInfo = encode(columnInfo);

        if (!tableName || !columnName || !columnInfo) return this;

        return this.appendFormatQueryPart("ALTER TABLE `{}` ADD COLUMN `{}` {};", tableName, columnName, columnInfo);
    },

    createIndex: function({indexName, tableName, columnList, condition, conditionParams, unique}) {
        indexName = safeMetaString(indexName);
        tableName = safeMetaString(tableName);

        if (!indexName || !tableName || !columnList || !columnList.length) return this;

        if (unique) {
            this.appendQueryPart("CREATE UNIQUE INDEX IF NOT EXISTS ");
        } else {
            this.appendQueryPart("CREATE INDEX IF NOT EXISTS ");
        }

        return this.appendFormatQueryPart("`{}` ON `{}` ({}) ", indexName, tableName, columnList.join(','))
            .where(condition, conditionParams);
    },

    dropIndex: function(indexName) {
        this.resetQueryCommand();

        return this.appendFormatQueryPart("DROP INDEX IF EXISTS `{}`;", safeMetaString(indexName));
    }
};