/**
 * Created by zhiyuan.huang@ddder.net.
 */

'use strict';

let wid = 0;

let workerPool = new Map();
let dbPool = new Map();
let dbThresholdPerWorker = 5;

function generateWorkerKey() {
    return 'ddder-worker-' + wid++;
}

function destroyWorker(key) {
    if (!key) return;

    key = key.toString();

    try {
        if (workerPool.has(key)) {
            workerPool.get(key).Uninitialize();
        } else {
            (new Worker(key)).Uninitialize();
        }
    } catch(e) {
        if (process.env.DDDER_ENV !== 'production') {
            log('destroy worker: ', key, ' failed');
            log(e.message);
            log(e.stack);
        }
    }

    workerPool.delete(key);
}

function initWorker(key) {
    const worker = require('./sqliteExec.worker')(key);

    workerPool.set(key, worker);
    return worker;
}

function evaluateWorkerPoolSpaceState() {
    let state = {
        full: [],
        unfilled: [],
        empty: []
    };

    let workerSpace = {};

    dbPool.forEach(workerKey => {
        if (workerSpace[workerKey] === undefined) {
            workerSpace[workerKey] = 0;
        }

        ++workerSpace[workerKey];
    });

    Object.keys(workerSpace).forEach(key => {
        let space = workerSpace[key];
        if (space >= dbThresholdPerWorker) {
            state.full.push(key);
        } else if (space <= 0) {
            state.empty.push(key);
        } else {
            state.unfilled.push(key);
        }
    });

    return state;
}

function cleanWorkerPool(state) {
    if (!state) state = evaluateWorkerPoolSpaceState();

    const emptyWorkerKeys = state.empty;

    emptyWorkerKeys.forEach(key => {
        destroyWorker(key);
    });

    state.empty = [];

    return state;
}

function enhanceWorkerInvokerWithPromise() {
    Worker.prototype.InvokePromise = function(...args) {
        return new Promise((resolve, reject) => {
            try {
                this.InvokeCallback(function(result) {
                    resolve(result);
                }, ...args);
            } catch(e) {
                reject(e);
            }
        })
    }
}

function databaseWorkerInvoker(path) {
    return function(...args) {
        let worker = workerPool.get(dbPool.get(path));
        return worker.InvokePromise('exec', path, ...args);
    }
}

enhanceWorkerInvokerWithPromise();

module.exports = {
    evaluateWorkerPoolSpaceState,
    initDatabaseWithPath: function*(path) {
        if (!path) return null;
        if (dbPool.has(path)) {
            return databaseWorkerInvoker(path);
        }

        let workerKey;

        let workerPoolState = evaluateWorkerPoolSpaceState();

        if (workerPoolState.unfilled.length) {
            workerKey = workerPoolState.unfilled[0];
        } else if (workerPoolState.empty.length) {
            workerKey = workerPoolState.empty[0];
            workerPoolState.unfilled.push(workerPoolState.empty.shift());
        } else {
            workerKey = generateWorkerKey();
            initWorker(workerKey);
        }

        cleanWorkerPool(workerPoolState);

        let targetWorker = workerPool.get(workerKey);

        if (!targetWorker) throw new Error('no worker is available for database: ' + path);

        let opened = yield targetWorker.InvokePromise('openDatabase', path);

        if (!opened) throw new Error('connecting to database: ', path, ' failed.');

        dbPool.set(path, workerKey);

        return databaseWorkerInvoker(path);
    },
    closeDatabaseWithPath: function*(path) {
        if (!path) return;

        let workerKey = dbPool.get(path);
        if (!workerKey) return;
        
        let worker = workerPool.get(workerKey);
        if (!worker) return;
        
        yield worker.InvokePromise('closeDatabase', path);

        dbPool.delete(path);

        cleanWorkerPool(evaluateWorkerPoolSpaceState())
    }
};