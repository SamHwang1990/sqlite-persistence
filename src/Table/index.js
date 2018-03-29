/**
 * Created by zhiyuan.huang@ddder.net.
 */

'use strict';

const CreateClass = require('../../classify.js').create;
const QueryCommand = require('../QueryCommand/index.js');
const DataTypes = require('../DataTypes.js');

const deleteAPI = require('./categories/delete.js');
const findAPI = require('./categories/find.js');
const insertAPI = require('./categories/insert.js');
const updateAPI = require('./categories/update.js');

const Table = CreateClass({
    Implements: [deleteAPI, findAPI, insertAPI, updateAPI],

    initialize: function(tableName, columns, options) {
        this.tableName = tableName;

        // will be set in Database sync
        this.database = undefined;
        this.databaseName = undefined;

        this.columns = new Map();
        this.indexes = new Map();
        this.constraints = new Map();
        this.primaryKey = undefined;

        this.recordClass = undefined;

        if (_.isObject(columns)) {
            this.defineColumns(columns);
        }

        this.columnDict = this._exportColumnDict();

        if (options && options.indexes) {
            this.defineIndexes(options.indexes);
        }
    },
    defineColumns: function(columns) {
        let columnKeys = Object.keys(columns);

        columnKeys.forEach(key => {
            let {type, autoIncrement, primaryKey, unique, notNull, defaultValue} = columns[key];

            if (typeof type === 'function') {
                type = type();
            }

            // 暂时只支持单主键
            if (primaryKey === true) {
                if (this.primaryKey) {
                    if (process.env.DDDER_ENV !== 'production') {
                        log('multi primary key: ' + key + ' constraint defined in table: ' + this.tableName);
                    }
                    primaryKey = false;
                } else {
                    this.primaryKey = key;
                }
            }

            this.columns.set(key, {
                type: type,
                autoIncrement,
                constraints: {
                    primaryKey,
                    unique,
                    notNull,
                    defaultValue
                }
            });
        });
    },
    defineIndexes: function(indexes) {
        if (!indexes) return;
        if (!Array.isArray(indexes)) indexes = [indexes];

        indexes.forEach(indexInfo => {
            let { unique, columnList, name, whereParams } = indexInfo;

            if (!name) {
                name = columnList.unshift(this.tableName).join('_');
            }

            this.indexes.set(name, {
                name,
                tableName: this.tableName,
                unique,
                columnList,
                whereParams
            })
        });
    },

    // 简单导出表的字段名、type
    _exportColumnDict: function() {
        let dict = {};

        this.columns.forEach((columnMeta, columnName) => {
            dict[columnName] = columnMeta.type;
        });

        return dict;
    },

    rowParser: function(row, tableDict) {
        if (!row) return row;

        if (!tableDict) {
            tableDict = this._exportColumnDict();
        }

        const columnList = Object.keys(row);
        columnList.forEach(columnName => {
            let value = row[columnName];
            if (value == null) return;

            let columnKey = tableDict[columnName];
            if (!columnKey) return;

            if (typeof columnKey !== 'string') {
                columnKey = columnKey.key;
            }

            let columnParser = DataTypes[columnKey] && DataTypes[columnKey].parse;

            if (columnParser) {
                row[columnName] = columnParser(value);
            }
        });

        return row;
    },

    rowListParser: function(rowList) {
        if (!rowList) return rowList;

        if (!Array.isArray(rowList)) {
            rowList = [rowList];
        }

        const tableDict = this._exportColumnDict();

        return rowList.map(row => this.rowParser(row, tableDict));
    },

    // 导出表的字段名、type、constraints
    exportColumnInfos: function() {
        let metas = {};

        this.columns.forEach((columnMeta, columnName) => {
            let { type, autoIncrement, constraints } = columnMeta;
            let { primaryKey, unique, notNull, defaultValue } = constraints;

            let metaSet = [];
            if (_.isPlainObject(type)) {
                metaSet.push(type.toSql ? type.toSql() : type.key);
            } else {
                metaSet.push(type.toString());
            }

            if (primaryKey) {
                metaSet.push('PRIMARY KEY');
            }

            if (autoIncrement) {
                metaSet.push('AUTOINCREMENT');
            }

            if (unique) {
                metaSet.push('UNIQUE');
            }

            if (defaultValue !== undefined) {
                metaSet.push('DEFAULT');
                metaSet.push(defaultValue === '' ? "''" : defaultValue);
            }

            if (notNull) {
                if (defaultValue == null) {
                    throw new Error('not null constraint must used with default constraint');
                } else {
                    metaSet.push('NOT NULL');
                }
            }

            metas[columnName] = metaSet.join(' ');
        });

        return metas;
    },

    exportIndexes: function() {

    },

    executeSql: function*(sqlString) {
        let queryCommand = new QueryCommand(this.databaseName);
        queryCommand.appendQueryPart(sqlString);
        return yield queryCommand.execute();
    },
    fetchSql: function*(sqlString) {
        let queryCommand = new QueryCommand(this.databaseName);
        queryCommand.appendQueryPart(sqlString);
        return yield queryCommand.fetch();
    }
});

function* createTableIfNotExist(tableInstance, databaseInstance) {
    let queryCommand = new QueryCommand(databaseInstance);
    queryCommand.createTable(tableInstance.tableName, tableInstance.exportColumnInfos());

    yield queryCommand.execute();
}

function* dropTable(tableName, databaseInstance) {
    let queryCommand = new QueryCommand(databaseInstance);
    yield queryCommand.dropTable(tableName).execute();
}

module.exports = Table;
Table.createTableIfNotExist = createTableIfNotExist;
Table.dropTable = dropTable;