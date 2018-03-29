/**
 * Created by zhiyuan.huang@ddder.net.
 */

'use strict';

const CreateClass = require('../classify.js').create;
const { TransactionType } = require('./utils/constants.js');

function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
}

function guid() {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}

const Transaction = CreateClass({
    initialize: function(database, options = {}) {
        this.database = database;

        this.savepoints = [];

        this.options = Object.assign({
            type: TransactionType.DEFERRED,
            isolationLevel: null
        }, options);

        this.parent = options.transaction;
        this.id = this.parent ? this.parent.id : guid();

        if (this.parent) {
            this.id = this.parent.id;
            this.parent.savepoints.push(this);
            this.name = this.id + '-savepoint-' + this.parent.savepoints.length;
        } else {
            this.id = this.name = guid();
        }

        delete this.options.transaction;

        const QueryCommand = require('./QueryCommand/index.js');
        this.queryCommand = new QueryCommand(this.database);
    },

    commit: function*() {
        if (this.finished) {
            throw new Error('Transaction cannot be committed because it has been finished with state: ' + this.finished);
        }

        this.finished = 'commit';
        yield this.queryCommand.commitTransaction(this).execute();
    },

    rollback: function*() {
        if (this.finished) {
            throw new Error('Transaction cannot be rolled back because it has been finished with state: ' + this.finished);
        }

        this.finished = 'rollback';
        yield this.queryCommand.rollbackTransaction(this).execute();
    },

    prepareEnviroment: function*() {
        try {
            yield this.begin();
            yield this.setIsolationLevel();
        } catch(e) {
            yield this.rollback();
            throw e;
        }
    },

    begin: function*() {
        yield this.queryCommand.startTransaction(this).execute();
    },

    setIsolationLevel: function*() {
        yield this.queryCommand.setIsolationLevel(this, this.isolationLevel).execute();
    }
});

module.exports = Transaction;