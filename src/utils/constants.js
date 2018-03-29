/**
 * Created by zhiyuan.huang@ddder.net.
 */

'use strict';

module.exports = {
    ErrorCode: {
        DB_NOT_EXISTED: 0,
        METHOD_NOT_FOUND: 1,
        SQLITE_ERROR: 3
    },
    ResponseDataType: {
        PRIMITIVE: 1,
        VALUE: 2,
        OBJECT_LIKE: 4
    },

    TransactionType: {
        DEFERRED: 'DEFERRED',
        IMMEDIATE: 'IMMEDIATE',
        EXCLUSIVE: 'EXCLUSIVE'
    },

    IsolationLevel: {
        READ_UNCOMMITTED: 'READ UNCOMMITTED',
        READ_COMMITTED: 'READ COMMITTED'
    }
};