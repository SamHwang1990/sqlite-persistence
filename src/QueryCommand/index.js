/**
 * Created by zhiyuan.huang@ddder.net.
 */

'use strict';

const { create: CreateClass } = require('../../classify.js');
const { getInstance: getDatabaseWithDatabaseName } = require('../Database.js');
const stringFormat = require('../../stringFormat.js');
const { getter: responseGetter } = require('../utils/workerResponseHelpers.js');
const recordSetParser = require('../utils/recordSetParser.js');

const dataManipulations = require('./catetories/dataManipulations.js');
const readingMethods = require('./catetories/readingMethods.js');
const schemaManipulations = require('./catetories/schemaManipulations.js');
const statusMethods = require('./catetories/statusMethods.js');
const transactionMethods = require('./catetories/transactionMethods.js');

const QueryCommand = CreateClass({
    Implements: [dataManipulations, readingMethods, schemaManipulations, statusMethods, transactionMethods],

    initialize: function(database) {
        this._sqlStringArray = [];

        this.database = database;
        this.databaseName = database.databaseName;

        this.invoker = database.getInvoker();
    },

    resetQueryCommand: function() {
        this._sqlStringArray = [];

        return this;
    },

    appendQueryPart: function(part) {
        this._sqlStringArray.push(part);

        return this;
    },

    appendFormatQueryPart: function(str, ...args) {
        return this.appendQueryPart(stringFormat(str, ...args));
    },

    _buildSqlString: function() {
        let sqlString = this._sqlStringArray.join('');
        if (sqlString[sqlString.length - 1] !== ';') sqlString += ';';
        return sqlString;
    },

    execute: function*() {
        // log(this._buildSqlString());
        const response = yield this.database.execCommand('execDML', this._buildSqlString());
        responseGetter(response);

        const errorCode = response.errorCode;

        if (errorCode && errorCode !== '-1') {
            const errorMsg = response.errorMsg;
            throw new Error(errorMsg);
        }

        const data = response.data;
        return data;
    },

    fetch: function*() {
        const response = yield this.database.execCommand('getRecordSet', this._buildSqlString());
        responseGetter(response);

        const errorCode = response.errorCode;

        if (errorCode && errorCode !== '-1') {
            const errorMsg = response.errorMsg;
            throw new Error(errorMsg);
        }

        const recordSet = response.data;
        return recordSetParser(recordSet);
    }
});

function* getQueryCommandWithDatabaseName(databaseName) {
    const database = yield getDatabaseWithDatabaseName(databaseName);
    return new QueryCommand(database);
}

function getQueryCommandWithDatabase(database) {
    return new QueryCommand(database);
}

module.exports = QueryCommand;
module.exports.getQueryCommandWithDatabaseName = getQueryCommandWithDatabaseName;
module.exports.getQueryCommandWithDatabase = getQueryCommandWithDatabase;