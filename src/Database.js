/**
 * Created by zhiyuan.huang@ddder.net.
 */

'use strict';

const CreateClass = require('../classify.js').create;

const { initDatabaseWithPath, closeDatabaseWithPath } = require('./DatabasePool.js');
const { createTableIfNotExist } = require('./Table/index.js');
const Transaction = require('./Transaction.js');

const dbBaseDirectory = GetAppCurrentPath('data/base/');

const Database = CreateClass({
    initialize: function(name) {
        this.databaseName = name;
        this.databaseFilePath = dbBaseDirectory + name;

        this.connected = false;
        this.closed = false;
        this.invoker = undefined;

        this.syncedTables = {};
        this.unsyncTables = {};
    },
    createParentDirectory: function() {
        let dbFile = new File(this.databaseFilePath);
        let parentDirectory = dbFile.getParentDirectory();

        if (!parentDirectory.isDirectory()) {
            parentDirectory.createDirectory();
        }
    },
    connect: function*() {
        this.createParentDirectory();

        const invoker = yield initDatabaseWithPath(this.databaseFilePath);
        this.connected = true;

        if (invoker) {
            this.invoker = invoker;
        }

        return invoker;
    },
    getInvoker: function() {
        return this.invoker.bind(this);
    },
    close: function*() {
        this.closed = true;
        yield closeDatabaseWithPath(this.databaseFilePath);
        this.invoker = null;
    },

    execCommand: function*(method = 'execDML', ...args) {
        if (this.closed) {
            throw new Error(this.databaseName + ' had closed. Failed to exec command');
        }

        if (!this.invoker) {
            throw new Error('no available executor for Database: ' + this.databaseName);
        }

        return yield this.invoker(method, ...args);
    },

    registerTable: function(tableInstance) {
        let tableName = tableInstance.tableName;

        if (this.syncedTables.hasOwnProperty(tableName)) {
            tableInstance.database = this;
            tableInstance.databaseName = this.databaseName;
        } else {
            this.unsyncTables[tableInstance.tableName] = tableInstance;
        }

        return this;
    },

    transaction: function*(options, autoCallback) {
        if (typeof options === 'function') {
            autoCallback = options;
            options = undefined;
        }

        const transaction = new Transaction(this, options);

        if (!autoCallback) {
            yield transaction.prepareEnviroment();
            return transaction;
        }

        try {
            yield transaction.prepareEnviroment();
            yield autoCallback(transaction);
            yield transaction.commit();
        } catch(e) {
            if (!transaction.finished) {
                try {
                    yield transaction.rollback();
                } catch (e) {}
            }

            throw e;
        }
    },

    sync: function*() {
        if (!this.connected) {
            yield this.connect();
        }

        let unsyncTableNames = Object.keys(this.unsyncTables);

        for (let i = 0; i < unsyncTableNames.length; ++i) {
            let tableName = unsyncTableNames[i];
            let tableInstance = this.unsyncTables[tableName];

            if (!tableInstance) continue;

            yield createTableIfNotExist(tableInstance, this);

            tableInstance.databaseName = this.databaseName;
            tableInstance.database = this;

            this.syncedTables[tableName] = tableInstance;
            delete this.unsyncTables[tableName];
        }
    }
});

const dbInstanceMap = new Map();

function* getInstance(name) {
    let instance = dbInstanceMap.get(name);

    if (instance && !instance.closed) {
        return instance;
    } else if (instance) {
        yield instance.close();
    }

    instance = new Database(name);
    yield instance.connect();

    dbInstanceMap.set(name, instance);

    return instance;
}

module.exports = Database;
module.exports.getInstance = getInstance;