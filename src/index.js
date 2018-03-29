/**
 * Created by zhiyuan.huang@ddder.net.
 */

'use strict';

const Database = require('./Database.js');
const Table = require('./Table/index.js');
const QueryCommand = require('./QueryCommand/index.js');
const Criteria = require('./Criteria.js');
const Transaction = require('./Transaction.js');
const Record = require('./Record.js');

module.exports = {
    getDatabase: Database.getInstance,

    Criteria,

    Table,
    createTableIfNotExist: Table.createTableIfNotExist,
    dropTable: Table.dropTable,

    getQueryCommandWithDatabase: QueryCommand.getQueryCommandWithDatabase,

    RecordFactory: Record.RecordFactory
};