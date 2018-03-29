/**
 * Created by zhiyuan.huang@ddder.net.
 */

'use strict';

const Transaction = require('../../Transaction.js');
const { safeMetaString } = require('../../utils/safeSql.js');
const stringFormat = require('../../../stringFormat.js');
const { IsolationLevel } = require('../../utils/constants.js');

module.exports = {
    startTransaction: function(transaction) {
        if (!transaction || !(transaction instanceof Transaction)) {
            throw new Error('Unable to start a transaction without transaction object!');
        }

        this.resetQueryCommand();

        if (transaction.parent) {
            this.appendFormatQueryPart("SAVEPOINT `{}`;", safeMetaString(transaction.name));
        } else {
            this.appendFormatQueryPart("BEGIN {} TRANSACTION;", transaction.options.type);
        }

        return this;
    },

    rollbackTransaction: function(transaction) {
        if (!transaction || !(transaction instanceof Transaction)) {
            throw new Error('Unable to rollback a transaction without transaction object!');
        }

        this.resetQueryCommand();

        if (transaction.parent) {
            this.appendFormatQueryPart("ROLLBACK TO `{}`;", safeMetaString(transaction.name));
        } else {
            this.appendQueryPart("ROLLBACK TRANSACTION;");
        }

        return this;
    },

    commitTransaction: function(transaction) {
        if (!transaction || !(transaction instanceof Transaction)) {
            throw new Error('Unable to commit a transaction without transaction object!');
        }

        this.resetQueryCommand();

        if (transaction.parent) {
            // Savepoints cannot be committed
            this.appendQueryPart("--");
            return this;
        }

        this.appendQueryPart('COMMIT TRANSACTION;');

        return this;
    },

    setIsolationLevel: function(transaction, level) {
        if (!transaction || !(transaction instanceof Transaction)) {
            throw new Error('Unable to set isolation level for a transaction without transaction object!');
        }

        this.resetQueryCommand();

        if (transaction.parent || !level) {
            // Not possible to set a separate isolation level for savepoints
            this.appendQueryPart("--");
            return this;
        }

        switch (level) {
            case IsolationLevel.READ_UNCOMMITTED:
                this.appendQueryPart('PRAGMA read_uncommitted = ON;');
                break;
            case IsolationLevel.READ_COMMITTED:
                this.appendQueryPart('PRAGMA read_uncommitted = OFF;');
                break;
            default:
                throw new Error('Unknown isolation level: ' + level);
        }

        return this;
    }
};