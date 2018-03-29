/**
 * Created by zhiyuan.huang@ddder.net.
 */

'use strict';

const { ErrorCode } = require('./utils/constants.js');
const { setter: responseSetter } = require('./utils/workerResponseHelpers.js')

let dbPool = new Map();

function openDatabase(path) {
    closeDatabase(path);

    let connected = false;

    // 调用底层api 创建数据库
    let database = CreateDB();

    if (database.open(path)) {
        connected = true;
        dbPool.set(path, {
            db: database,
            connected: true
        });
    } else {
        dbPool.set(path, {
            db: database,
            connected: false
        });
        closeDatabase(path);
    }

    return connected;
}

function closeDatabase(path) {
    const dbMeta = dbPool.get(path);
    if (!dbMeta) return;

    let {db, connected} = dbMeta;

    if (db && connected) db.close();

    dbPool.delete(path);
}

function cleanPool() {
    dbPool.forEach((_, path) => {
        closeDatabase(path);
    });

    dbPool.clear();
}

// 期望做关于Insert、Update、Delete 的操作
function execDML(dbMeta, response, sqlString) {
    const db = dbMeta.db;
    const rowsChanged = db.execDML(sqlString);

    if (rowsChanged < 0) {
        response.errorMsg = 'failed to execDML with sql: ' + sqlString;
        response.errorCode = ErrorCode.SQLITE_ERROR;
    } else {
        response.data = [rowsChanged, db.lastRowId()];
    }
}

// function execQuery(dbMeta, response, sqlString) {
//     const db = dbMeta.db;
//     const rowsChanged = db.execDML(sqlString);
//
//     if (rowsChanged < 0) {
//         response.setProperty('error_code', ErrorCode.SQLITE_ERROR);
//         response.setProperty('error_msg', 'failed to execDML with sql: ', sqlString);
//     } else {
//         response.setProperty('data', [rowsChanged, db.lastRowId()]);
//     }
// }

function getRecordSet(dbMeta, response, sqlString) {
    const db = dbMeta.db;
    const recordSet = db.getRecordset(sqlString);
    response.data = recordSet;
}

function compileStatement(path) {
    // todo
}

function compileAndExecDML(path) {
    // todo
}

function compileAndExecQuery(path) {

}

function lastInsertRowId(dbMeta, response) {
    response.data = dbMeta.db.lastRowId();
}

const execListener = {
    openDatabase,
    closeDatabase,
    cleanPool,

    execDML,
    // execQuery,
    getRecordSet,
    compileStatement,
    compileAndExecDML,
    compileAndExecQuery,
    lastInsertRowId
}

function exec(path, method, ...args) {
    let db = dbPool.get(path);
    let response = new Value();
    response.setObject();

    responseSetter(response);

    if (method === 'openDatabase') {
        const connected = execListener[method].call(execListener, path);

        if (!connected) {
            response.errorCode = ErrorCode.SQLITE_ERROR;
            response.errorMsg = 'db open failed';
        } else {
            response.data = true;
        }

        return response;
    }

    if (!db) {
        response.errorCode = ErrorCode.DB_NOT_EXISTED;
        response.errorMsg = 'sqlite db not existed';
        return response;
    }

    if (!execListener.hasOwnProperty(method)) {
        response.errorCode = ErrorCode.METHOD_NOT_FOUND;
        response.errorMsg = 'can not find method: ' + method;
        return response;
    }

    const result = execListener[method].call(execListener, db, response, ...args);

    if (response !== result && result !== undefined) {
        response.data = result;
    }

    return response;
}

module.exports = {
    exec,
    openDatabase,
    closeDatabase
};

onRuntimeShutdown(() => {
    cleanPool();
});