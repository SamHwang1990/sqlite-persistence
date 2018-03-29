/**
 *
 * Created by zhiyuan.huang@ddder.net.
 */

'use strict';

const { evaluateWorkerPoolSpaceState } = require('../src/DatabasePool.js');
const { getInstance: getDatabase } = require('../src/Database.js');

const { RecordFactory } = require('../src/Record.js');
const { getQueryCommandWithDatabase } = require('../src/QueryCommand/index.js');
const transformRowsToRecords = require('../src/utils/transformRowsToRecords.js');
const Criteria = require('../src/Criteria.js');
const Table = require('../src/Table/index.js');
const DataTypes = require('../src/DataTypes.js');
const Transaction = require('../src/Transaction.js');

// 参考node.js asserts 模块写的一个断言工具
const assert = require('../../../utils/assert/index.js');

const dbName = 'test/bar';
function* beforeEach() {
    const barDB = yield getDatabase(dbName);
    yield Table.dropTable('user_info', barDB);
    return barDB;
}

function DatabaseConnectionTestCase() {
    return co(function*() {
        const fooDBName = 'test/foo';

        let beginPoolState = evaluateWorkerPoolSpaceState();
        assert.equal(beginPoolState.full.length, 0);
        assert.equal(beginPoolState.unfilled.length, 0);
        assert.equal(beginPoolState.empty.length, 0);

        const fooDB = yield getDatabase(fooDBName);
        assert.equal(fooDB.connected, true);

        let endPoolState = evaluateWorkerPoolSpaceState();
        assert.equal(endPoolState.full.length, 0);
        assert.equal(endPoolState.unfilled.length, 1);
        assert.equal(endPoolState.empty.length, 0);

        yield getDatabase('test/foo2');
        yield getDatabase('test/foo3');
        yield getDatabase('test/foo4');
        yield getDatabase('test/foo5');

        endPoolState = evaluateWorkerPoolSpaceState();
        assert.equal(endPoolState.full.length, 1);
        assert.equal(endPoolState.unfilled.length, 0);
        assert.equal(endPoolState.empty.length, 0);

        // 获取已打开的数据库，不需要尝试另起worker
        yield getDatabase('test/foo2');
        endPoolState = evaluateWorkerPoolSpaceState();
        assert.equal(endPoolState.full.length, 1);
        assert.equal(endPoolState.full[0], 'ddder-worker-0');
        assert.equal(endPoolState.unfilled.length, 0);
        assert.equal(endPoolState.empty.length, 0);

        yield getDatabase('test/foo6');
        endPoolState = evaluateWorkerPoolSpaceState();
        assert.equal(endPoolState.full.length, 1);
        assert.equal(endPoolState.full[0], 'ddder-worker-0');
        assert.equal(endPoolState.unfilled.length, 1);
        assert.equal(endPoolState.unfilled[0], 'ddder-worker-1');
        assert.equal(endPoolState.empty.length, 0);

    }).catch(e => {
        log(e.message);
        log(e.stack);
    });
}

function RecordSpecTestCase() {
    const UserRecord = RecordFactory(['userName', 'gender', 'mobile', 'address']);

    const Foo = new UserRecord();
    Foo.importEntry({
        userName: 'Foo',
        gender: 'male',
        mobile: '10086',
        address: '天安门'
    });

    assert.equal(Foo.getValue('userName'), 'Foo');

    Foo.setValue('gender', 'female');
    assert.equal(Foo.getValue('gender'), 'female');

    let fullEntry = Foo.exportEntry();
    assert.equal(fullEntry.userName, 'Foo');
    assert.equal(fullEntry.gender, 'female');

    let tableExport = Foo.exportForTable(['userName', 'mobile']);
    assert.equal(tableExport.userName, 'Foo');
    assert.equal(tableExport.mobile, '10086');
    assert.equal(tableExport.gender, undefined);

    Foo.mergeRecord({
        userName: 'Fake Foo',
        mobile: '10000'
    }, true);

    assert.equal(Foo.getValue('userName'), 'Fake Foo');
    assert.equal(Foo.getValue('mobile'), '10000');
    assert.equal(Foo.getValue('gender'), undefined);
    assert.equal(Foo.getValue('address'), undefined);
}

function createFakeDatabaseInstance() {
    return {
        databaseName: 'fake_db',
        getInvoker: () => () => {}
    }
}

function QueryCommandSqlStringTestCase() {
    const fakeDbInstance = createFakeDatabaseInstance();

    let queryCommand = getQueryCommandWithDatabase(fakeDbInstance);

    assert.equal(queryCommand.databaseName, fakeDbInstance.databaseName);
    assert.equal(queryCommand.database, fakeDbInstance);

    // schemaManipulations
    queryCommand.createTable('foo', {userId: 'INTEGER PRIMARY KEY', userName: false, age: 'unique not null default 1'});
    assert.equal(
        queryCommand._buildSqlString(),
        'CREATE TABLE IF NOT EXISTS `foo` (`userId` INTEGER PRIMARY KEY,`userName`,`age` unique not null default 1);'
    );

    queryCommand.addColumn('foo', 'gender', 'BOOLEAN NOT NULL DEFAULT 1');
    assert.equal(
        queryCommand._buildSqlString(),
        'ALTER TABLE `foo` ADD COLUMN `gender` BOOLEAN NOT NULL DEFAULT 1;'
    );

    queryCommand.dropTable('foo');
    assert.equal(
        queryCommand._buildSqlString(),
        'DROP TABLE IF EXISTS `foo`;'
    )

    // dataManipulations
    queryCommand.insertRow('foo', {
        userName: 'foo',
        age: 2,
        gender: null
    });
    assert.equal(
        queryCommand._buildSqlString(),
        "INSERT INTO `foo` (userName,age,gender) VALUES ('foo','2','NULL');"
    );

    queryCommand.insertRow('foo', [
        {
            userName: 'foo',
            age: 2,
            gender: null
        },
        {
            userName: 'bar',
            gender: 'male'
        }
        ]);
    assert.equal(
        queryCommand._buildSqlString(),
        "INSERT INTO `foo` (userName,age,gender) VALUES ('foo','2','NULL');" +
        "INSERT INTO `foo` (userName,gender) VALUES ('bar','male');"
    );

    queryCommand.upsertRow('foo', {
        userName: 'foo',
        age: 2,
        gender: null
    }, ['id', 'userName', 'age', 'gender'], 'id');

    assert.equal(
        queryCommand._buildSqlString(),
        "INSERT OR REPLACE INTO `foo` (id,userName,age,gender) SELECT `id`,'foo','2','NULL' FROM ( SELECT NULL ) LEFT JOIN ( SELECT * FROM foo WHERE `id` = 'NULL' );"
    );

    queryCommand.upsertRow('foo', {
        id: 1,
        userName: 'foo',
        age: 2,
        gender: null
    }, ['id', 'userName', 'age', 'gender'], 'id');

    assert.equal(
        queryCommand._buildSqlString(),
        "INSERT OR REPLACE INTO `foo` (id,userName,age,gender) SELECT '1','foo','2','NULL' FROM ( SELECT NULL ) LEFT JOIN ( SELECT * FROM foo WHERE `id` = '1' );"
    );

    queryCommand.updateRow('foo', {
        gender: 0
    }, 'userName = :userName', { userName: 'foo' });
    assert.equal(
        queryCommand._buildSqlString(),
        "UPDATE `foo` SET `gender`='0' WHERE userName = 'foo' ;"
    );

    queryCommand.updateRow(
        'foo',
        {gender: 0, age: 100},
        'userName = :userName',
        { userName: 'foo' }
        );
    assert.equal(
        queryCommand._buildSqlString(),
        "UPDATE `foo` SET `gender`='0',`age`='100' WHERE userName = 'foo' ;"
    );

    queryCommand.deleteRow('foo', 'userName = :userName', { userName: 'foo' });
    assert.equal(
        queryCommand._buildSqlString(),
        "DELETE FROM `foo` WHERE userName = 'foo' ;"
    );

    // readingMethods
    queryCommand.select('userId,userName,age,gender', true);
    assert.equal(
        queryCommand._buildSqlString(),
        "SELECT DISTINCT 'userId,userName,age,gender' ;"
    );

    queryCommand.from('foo');
    assert.equal(
        queryCommand._buildSqlString(),
        "SELECT DISTINCT 'userId,userName,age,gender' FROM 'foo' ;"
    );

    queryCommand.where('userName=:userName', {userName: 'foo'});
    assert.equal(
        queryCommand._buildSqlString(),
        "SELECT DISTINCT 'userId,userName,age,gender' FROM 'foo' WHERE userName='foo' ;"
    );

    queryCommand.orderBy('age', false);
    assert.equal(
        queryCommand._buildSqlString(),
        "SELECT DISTINCT 'userId,userName,age,gender' FROM 'foo' WHERE userName='foo' ORDER BY age ASC ;"
    );

    queryCommand.limit(10);
    assert.equal(
        queryCommand._buildSqlString(),
        "SELECT DISTINCT 'userId,userName,age,gender' FROM 'foo' WHERE userName='foo' ORDER BY age ASC LIMIT 10 ;"
    );

    queryCommand.offset(5);
    assert.equal(
        queryCommand._buildSqlString(),
        "SELECT DISTINCT 'userId,userName,age,gender' FROM 'foo' WHERE userName='foo' ORDER BY age ASC LIMIT 10 OFFSET 5 ;"
    );

    queryCommand.countAll();
    assert.equal(
        queryCommand._buildSqlString(),
        "SELECT COUNT(*) ;"
    );

    // transactionMethods
    let fooTransaction = new Transaction(fakeDbInstance, {
        isolationLevel: 'READ UNCOMMITTED',
        type: 'IMMEDIATE'
    });

    queryCommand.startTransaction(fooTransaction);
    assert.equal(
        queryCommand._buildSqlString(),
        "BEGIN IMMEDIATE TRANSACTION;"
    );

    queryCommand.rollbackTransaction(fooTransaction);
    assert.equal(
        queryCommand._buildSqlString(),
        "ROLLBACK TRANSACTION;"
    );

    queryCommand.commitTransaction(fooTransaction);
    assert.equal(
        queryCommand._buildSqlString(),
        "COMMIT TRANSACTION;"
    );

    queryCommand.setIsolationLevel(fooTransaction, 'READ UNCOMMITTED');
    assert.equal(
        queryCommand._buildSqlString(),
        "PRAGMA read_uncommitted = ON;"
    );

    let barTransaction = new Transaction(fakeDbInstance, {
        transaction: fooTransaction
    });

    assert.equal(barTransaction.parent, fooTransaction);
    assert.equal(barTransaction.id, fooTransaction.id);

    queryCommand.startTransaction(barTransaction);
    assert.equal(
        queryCommand._buildSqlString(),
        "SAVEPOINT `" + barTransaction.name + "`;"
    );

    queryCommand.rollbackTransaction(barTransaction);
    assert.equal(
        queryCommand._buildSqlString(),
        "ROLLBACK TO `" + barTransaction.name + "`;"
    );

    queryCommand.commitTransaction(barTransaction);
    assert.equal(
        queryCommand._buildSqlString(),
        "--;"
    );

    queryCommand.setIsolationLevel(barTransaction, 'READ UNCOMMITTED');
    assert.equal(
        queryCommand._buildSqlString(),
        "--;"
    );
}

function CriteriaBasicTestCase() {
    const fakeDbInstance = createFakeDatabaseInstance();

    let queryCommand = getQueryCommandWithDatabase(fakeDbInstance);

    const criteria = new Criteria();

    criteria
        .select('userId,userName')
        .whereCondition('userName=:userName')
        .whereConditionParams({userName: 'foo'})
        .orderBy('age')
        .desc(false)
        .limit(10)
        .offset(5)
        .distinct(true);


    assert.equal(
        criteria.applyToSelectQueryCommand(queryCommand, 'foo')._buildSqlString(),
        "SELECT DISTINCT 'userId,userName' FROM 'foo' WHERE userName='foo' ORDER BY age ASC OFFSET 5 LIMIT 10 ;"
    );

    assert.equal(
        criteria.applyToDeleteQueryCommand(queryCommand, 'foo')._buildSqlString(),
        "DELETE FROM `foo` WHERE userName='foo' ;"
    )
}

function TableBasicTestCase() {
    return co(function*() {
        const dbName = 'test/bar';

        const barDB = yield getDatabase(dbName);

        yield Table.dropTable('user_info', barDB);

        const UserInfoTable = new Table('user_info', {
            id: {
                type: 'INTEGER',
                primaryKey: true
            },
            userName: {
                type: 'TEXT',
                unique: true
            },
            age: {
                type: 'INTEGER',
                defaultValue: 1
            },
            gender: {
                type: 'BOOLEAN',
                defaultValue: 0
            }
        });

        barDB.registerTable(UserInfoTable);

        yield barDB.sync();

        const UserRecord = RecordFactory(['id', 'userName', 'age', 'gender']);

        const sam = new UserRecord();
        sam.importEntry({
            userName: 'sam',
            age: 18,
            gender: 1
        });

        yield UserInfoTable.insertRecord(sam);
        assert.equal(sam.getValue('id'), 1);

        let findResult = transformRowsToRecords((yield UserInfoTable.findWithPrimaryKeys(sam.getValue('id'))), UserRecord);
        assert.equal(findResult[0].getValue('userName'), 'sam');
        assert.equal(findResult[0].getValue('age'), 18);
        assert.equal(findResult[0].getValue('gender'), 1);

        findResult = yield UserInfoTable.findLastestRecord();
        assert.equal(findResult.id, 1);
        assert.equal(findResult.userName, 'sam');
        assert.equal(findResult.age, 18);
        assert.equal(findResult.gender, 1);

        const young = new UserRecord();
        young.importEntry({
            userName: 'young',
            age: 18,
            gender: 0
        });

        const lin = new UserRecord();
        lin.importEntry({
            userName: 'lin',
            age: 18,
            gender: 1
        });

        yield UserInfoTable.insertRecordList([young, lin]);

        findResult = yield UserInfoTable.findAllWithWhereCondition('gender=:gender', {gender: 1});
        assert.equal(findResult.length, 2);

        findResult = yield UserInfoTable.findFirstRowWithWhereCondition('gender=:gender', {gender: 1});
        assert.equal(findResult.id, 1);
        assert.equal(findResult.userName, 'sam');
        assert.equal(findResult.age, 18);
        assert.equal(findResult.gender, 1);

        findResult = yield UserInfoTable.countTotalRecord();
        assert.equal(findResult, 3);

        findResult = yield UserInfoTable.countWithWhereCondition('gender=:gender', {gender: 1});
        assert.equal(findResult, 2);

        findResult = yield UserInfoTable.findWithPrimaryKeys([1, 2]);
        assert.equal(findResult.length, 2);
        assert.equal(findResult[0].id, 1);
        assert.equal(findResult[0].userName, 'sam');
        assert.equal(findResult[0].age, 18);
        assert.equal(findResult[0].gender, 1);

        assert.equal(findResult[1].id, 2);
        assert.equal(findResult[1].userName, 'young');
        assert.equal(findResult[1].age, 18);
        assert.equal(findResult[1].gender, 0);

        findResult = yield UserInfoTable.findAllWithWhereKeyValue('gender', 1);
        assert.equal(findResult.length, 2);
        assert.equal(findResult[0].id, 1);
        assert.equal(findResult[0].userName, 'sam');
        assert.equal(findResult[0].age, 18);
        assert.equal(findResult[0].gender, 1);

        assert.equal(findResult[1].id, 3);
        assert.equal(findResult[1].userName, 'lin');
        assert.equal(findResult[1].age, 18);
        assert.equal(findResult[1].gender, 1);

        lin.setValue('age', 20);
        yield UserInfoTable.updateRecord(lin);

        young.setValue('age', 17);
        sam.setValue('age', 17);
        yield UserInfoTable.updateRecordList([sam, young]);

        yield UserInfoTable.updateValueWithWhereCondition('age', 19, "userName=:userName", { userName: 'lin' });
        yield UserInfoTable.updateValuesWithWhereCondition({age: 20, gender: 0}, "userName=:userName", { userName: 'lin' });
        yield UserInfoTable.updateValuesWithPrimaryKey({age: 21}, sam.getValue(UserInfoTable.primaryKey));
        yield UserInfoTable.updateValuesWithPrimaryKeyList({age: 25}, [lin.getValue(UserInfoTable.primaryKey), young.getValue(UserInfoTable.primaryKey)]);
        yield UserInfoTable.updateValuesWithWhereKey({age: 10}, 'userName', ['sam', 'young']);

        const foo1 = new UserRecord();
        foo1.importEntry({
            userName: 'foo1',
            age: 18,
            gender: 1
        });

        const foo2 = new UserRecord();
        foo2.importEntry({
            userName: 'foo2',
            age: 18,
            gender: 1
        });

        const foo3 = new UserRecord();
        foo3.importEntry({
            userName: 'foo3',
            age: 18,
            gender: 1
        });

        const foo4 = new UserRecord();
        foo4.importEntry({
            userName: 'foo4',
            age: 18,
            gender: 1
        });

        yield UserInfoTable.insertRecordList([foo1, foo2, foo3, foo4]);

        yield UserInfoTable.deleteRecord(foo1);
        yield UserInfoTable.deleteRecordList([foo2, foo3, foo4]);

        try {
            yield barDB.transaction(function*(/*transaction*/) {
                yield UserInfoTable.insertRecordList([foo1, foo2, foo3, foo4]);
                throw new Error('error in transaction');
                yield UserInfoTable.deleteWithWhereCondition('`userName` in (:userNameList)', {
                    userNameList: [foo1.getValue('userName'), foo2.getValue('userName'), foo3.getValue('userName')]
                });
            });
        } catch(e) {
            assert.equal(e.message, 'error in transaction');
            let fetchResult = yield UserInfoTable.findAllWithWhereCondition("`userName` in (:userNameList)", {
                userNameList: ['foo1', 'foo2', 'foo3']
            });

            assert.equal(fetchResult.length, 0);
        }

        yield barDB.transaction(function*(transaction) {
            let subTransaction = yield barDB.transaction({
                transaction
            });

            yield UserInfoTable.insertRecord(foo1);

            yield subTransaction.begin();
            yield UserInfoTable.insertRecord(foo2);
            yield subTransaction.rollback();
        });

        findResult = yield UserInfoTable.findFirstRowWithWhereCondition('`userName`=:userName', {userName: 'foo1'});
        assert.equal(findResult.age, 18);
        assert.equal(findResult.gender, 1)
    });
}

function TableCreationTestCase() {
    co(function* () {
        const barDB = yield beforeEach();

        const UserInfoTable = new Table('user_info', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true
            },
            userName: {
                type: DataTypes.TEXT,
                unique: true
            },
            signature: {
                type: DataTypes.TEXT,
                defaultValue: ''
            }
        });

        barDB.registerTable(UserInfoTable);

        yield barDB.sync();
    });
}

function TableInsertListTestCase() {
    co(function* () {
        const barDB = yield beforeEach();

        const UserInfoTable = new Table('user_info', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true
            },
            userName: {
                type: DataTypes.TEXT,
                unique: true
            },
            age: {
                type: DataTypes.INTEGER
            },
            signature: {
                type: DataTypes.TEXT,
                defaultValue: ''
            }
        });

        barDB.registerTable(UserInfoTable);

        yield barDB.sync();

        const UserInfoRecord = new RecordFactory(['id', 'userName', 'age', 'signature']);

        const sam = new UserInfoRecord();
        sam.importEntry({
            userName: 'Sam',
            age: 18
        });

        const young = new UserInfoRecord();
        young.importEntry({
            userName: 'Young',
            signature: 'keep moving'
        });

        yield UserInfoTable.insertRecordList([sam, young]);

        assert.equal(sam.getValue('id'), 1);
        assert.equal(young.getValue('id'), 2);
    });
}

function ColumnTypeAndUpsertTestCase() {
    return co(function*() {
        const barDB = yield beforeEach();

        const UserInfoTable = new Table('user_info', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true
            },
            userName: {
                type: DataTypes.TEXT
            },
            birthTime: {
                type: DataTypes.DATE
            },
            birthday: {
                type: DataTypes.DATEONLY
            },
            isMale: {
                type: DataTypes.BOOLEAN,
                defaultValue: true
            }
        });

        barDB.registerTable(UserInfoTable);

        yield barDB.sync();

        const UserRecord = RecordFactory(['id', 'userName', 'birthTime', 'birthday', 'isMale']);
        const young = new UserRecord();
        young.importEntry({
            userName: '',
            birthTime: new Date(),
            isMale: false
        });

        yield UserInfoTable.insertRecord(young);

        let foundRow = (yield UserInfoTable.findWithPrimaryKeys(young.getValue('id')))[0];
        assert.equal(foundRow.birthTime.toString(), young.getValue('birthTime').toString());
        assert.equal(foundRow.birthday, null);
        assert.ok(foundRow.isMale === false);

        const sam = new UserRecord();
        sam.importEntry({
            userName: 'sam',
            birthTime: new Date(),
            isMale: true
        });

        const bank = new UserRecord();
        bank.importEntry({
            userName: null,
            isMale: true
        });

        young.setValue('userName', 'new young');

        yield UserInfoTable.upsertRecordList([sam, young, bank]);

        assert.equal(sam.getValue('id'), 2);

        assert.equal(young.getValue('id'), 1);
        foundRow = (yield UserInfoTable.findWithPrimaryKeys(young.getValue('id')))[0];
        assert.equal(foundRow.userName, 'new young');
        assert.equal(foundRow.birthTime.toString(), young.getValue('birthTime').toString());
        assert.equal(foundRow.birthday, null);
        assert.ok(foundRow.isMale === false);
    });
}

function EmojiTestCase() {
    return co(function*() {
        let input = new INPUT();
        input.setText('\ud83c\udfb9\ud83c\udde8\ud83c\uddf3');
        document.append(input);

        log(input.getText());

        const barDB = yield beforeEach();

        const UserInfoTable = new Table('user_info', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true
            },
            userName: {
                type: DataTypes.TEXT
            }
        });

        barDB.registerTable(UserInfoTable);

        yield barDB.sync();

        const UserRecord = RecordFactory(['id', 'userName']);
        const young = new UserRecord();

        young.importEntry({
            userName: '111\ud83c\udfb9\ud83c\udde8\ud83c\uddf3',
        });

        yield UserInfoTable.insertRecord(young);

        let foundRow = (yield UserInfoTable.findWithPrimaryKeys(young.getValue('id')))[0];

        log(foundRow);
    });
}

module.exports = {
    init: function() {
        // DatabaseConnectionTestCase();
        // RecordSpecTestCase();
        // QueryCommandSqlStringTestCase();
        // CriteriaBasicTestCase();
        // TableBasicTestCase();
        // ColumnTypeAndUpsertTestCase();
        EmojiTestCase();

        // TableCreationTestCase();
        // TableInsertListTestCase();
    },
    dispose: function() {

    }
};