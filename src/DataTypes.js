/**
 * Created by zhiyuan.huang@ddder.net.
 */

'use strict';

const CreateClass = require('../classify.js').create;

const Validator = require('./utils/dataTypesValidator.js').validator;
const momentTz = require('moment-timezone');
const moment = require('moment');

function warn(text) {
    log(text + '\n>> Check: ' + 'https://www.sqlite.org/datatype3.html');
}

const AbstractType = CreateClass({
    initialize: function() {},
    toString: function(options) {
        return this.toSql(options);
    },
    toSql: function() {
        return this.key || '';
    },
    stringify: function(value, options) {
        if (this._stringify) {
            return this._stringify(value, options);
        }

        return value;
    }
});

const DATE = AbstractType.extend({
    initialize: function(length) {
        const options = typeof length === 'object' && length || { length };

        this.options = options;
        this._length = options.length || '';
    },
    key: 'DATE',
    toSql: function() {
        return 'DATETIME';
    },
    validate: function(value) {
        if (!Validator.isDate(String(value))) {
            throw new Error(value + ' is not a valid date');
        }

        return true;
    },
    _applyTimezone: function(date, options) {
        if (options.timezone) {
            if (momentTz.tz.zone(options.timezone)) {
                date = momentTz(date).tz(options.timezone);
            } else {
                date = moment(date).utcOffset(options.timezone);
            }
        } else {
            date = momentTz(date);
        }

        return date;
    },
    _stringify: function(date, options = {}) {
        date = this._applyTimezone(date, options);

        // Z here means current timezone, _not_ UTC
        return date.format('YYYY-MM-DD HH:mm:ss.SSS Z');
    },
    Statics: {
        key: 'DATE',
        types: ['DATETIME'],
        parse: function parse(date) {
            return moment(date, 'YYYY-MM-DD HH:mm:ss.SSS Z').toDate();
        }
    }
});

const DATEONLY = DATE.extend({
    key: 'DATEONLY',
    toSql: function() {
        return 'DATE';
    },
    _stringify: function(date) {
        return moment(date).format('YYYY-MM-DD');
    },
    Statics: {
        key: 'DATEONLY',
        types: ['DATE'],
        parse: function(date) {
            return moment(date, 'YYYY-MM-DD').toDate();
        }

    }
});

const STRING = AbstractType.extend({
    key: 'STRING',
    initialize: function(length, binary) {
        const options = typeof length === 'object' && length || {length, binary};
        this.options = options;
        this._binary = options.binary;
        this._length = options.length || 255;
    },
    toSql: function() {
        if (this._binary) {
            return 'VARCHAR BINARY(' + this._length + ')';
        } else {
            return 'VARCHAR(' + this._length + ')';
        }
    },
    validate: function(value) {
        if (Object.prototype.toString.call(value) !== '[object String]') {
            if (_.isNumber(value)) {
                return true;
            }
            throw new Error(value + ' is not a valid string');
        }

        return true;
    },
    Statics: {
        key: 'STRING',
        types: ['VARCHAR', 'VARCHAR BINARY']
    }
});

Object.defineProperty(STRING.prototype, 'BINARY', {
    get: function() {
        this._binary = true;
        this.options.binary = true;
        return this;
    }
});

const TEXT = AbstractType.extend({
    key: 'TEXT',
    initialize: function(length) {
        const options = typeof length === 'object' && length || {length};
        this.options = options;
        this._length = options.length || '';
    },
    toSql: function() {
        if (this._length) {
            warn('SQLite does not support TEXT with options. Plain `TEXT` will be used instead.');
            this._length = undefined;
        }
        return 'TEXT';
    },
    validate: function(value) {
        if (!_.isString(value)) {
            throw new Error(value + ' is not a valid string');
        }

        return true;
    },
    Statics: {
        key: 'TEXT',
        types: ['TEXT']
    }
});

const CHAR = STRING.extend({
    key: 'CHAR',
    initialize: function(...args) {
        this._super(...args);
    },
    toSql: function() {
        if (this._binary) {
            return 'CHAR BINARY(' + this._length + ')';
        } else {
            return 'CHAR(' + this._length + ')';
        }
    },
    Statics: {
        key: 'CHAR',
        types: ['CHAR', 'CHAR BINARY']
    }
});

const BLOB = AbstractType.extend({
    key: 'BLOB',
    escape: false,
    initialize: function(length) {
        const options = typeof length === 'object' && length || {length};
        if (!(this instanceof BLOB)) return new BLOB(options);
        this.options = options;
        this._length = options.length || '';
    },
    toSql: function() {
        switch (this._length.toLowerCase()) {
            case 'tiny':
                return 'TINYBLOB';
            case 'medium':
                return 'MEDIUMBLOB';
            case 'long':
                return 'LONGBLOB';
            default:
                return this.key;
        }
    },
    validate: function(value) {
        if (!_.isString(value)) {
            throw new Error(value + ' is not a valid blob');
        }

        return true;
    },
    _stringify: function(value) {
        return value.toString();
    },
    Statics: {
        key: 'BLOB',
        types: ['TINYBLOB', 'BLOB', 'LONGBLOB']
    }
});

const NUMBER = AbstractType.extend({
    key: 'NUMBER',
    initialize: function(options = {}) {
        this.options = options;
        this._length = options.length;
        this._zerofill = options.zerofill;
        this._decimals = options.decimals;
        this._precision = options.precision;
        this._scale = options.scale;
        this._unsigned = options.unsigned;
    },
    toSql: function() {
        let result = this.key;

        if (this._unsigned) {
            result += ' UNSIGNED';
        }
        if (this._zerofill) {
            result += ' ZEROFILL';
        }

        if (this._length) {
            result += '(' + this._length;
            if (typeof this._decimals === 'number') {
                result += ',' + this._decimals;
            }
            result += ')';
        }
        return result;
    },
    validate: function(value) {
        if (!Validator.isFloat(String(value))) {
            throw new Error(value + ' is not a valid number');
        }

        return true;
    },
    Statics: {
        key: 'NUMBER'
    }
});

Object.defineProperty(NUMBER.prototype, 'UNSIGNED', {
    get: function() {
        this._unsigned = true;
        this.options.unsigned = true;
        return this;
    }
});

Object.defineProperty(NUMBER.prototype, 'ZEROFILL', {
    get: function() {
        this._zerofill = true;
        this.options.zerofill = true;
        return this;
    }
});

const FLOAT = NUMBER.extend({
    key: 'FLOAT',
    validate: function(value) {
        if (!Validator.isFloat(String(value))) {
            throw new Error(value + ' is not a valid float');
        }

        return true;
    },
    Statics: {
        key: 'FLOAT',
        types: ['FLOAT']
    }
});

const REAL = NUMBER.extend({
    key: 'REAL',
    Statics: {
        key: 'REAL',
        types: ['REAL']
    }
});

const DOUBLE = NUMBER.extend({
    key: 'DOUBLE PRECISION',
    Statics: {
        key: 'DOUBLE PRECISION',
        types: ['DOUBLE PRECISION']
    }
});

const INTEGER = NUMBER.extend({
    key: 'INTEGER',
    validate: function(value) {
        if (!Validator.isInt(String(value))) {
            throw new Error(value + ' is not a valid integer');
        }

        return true;
    },
    Statics: {
        key: 'INTEGER',
        types: ['INTEGER']
    }
});

const BIGINT = NUMBER.extend({
    key: 'BIGINT',
    Statics: {
        key: 'BIGINT',
        types: ['BIGINT']
    }
});

[FLOAT, DOUBLE, REAL].forEach(floating => {
    floating.parse = function parse(value) {
        if (_.isString(value)) {
            if (value === 'NaN') {
                return NaN;
            } else if (value === 'Infinity') {
                return Infinity;
            } else if (value === '-Infinity') {
                return -Infinity;
            }
        }
        return value;
    };
});

const BOOLEAN = AbstractType.extend({
    key: 'BOOLEAN',
    toSql: function() {
        return 'TINYINT(1)';
    },
    validate: function(value) {
        if (!Validator.isBoolean(String(value))) {
            throw new Error(value + ' is not a valid boolean');
        }

        return true;
    },
    Statics: {
        key: 'BOOLEAN',
        types: ['TINYINT'],
        parse: function(value) {
            value = value.toLowerCase();
            return value !== 'false' && value !== '0' && value !== 'null';
        }
    }
});

const ENUM = AbstractType.extend({
    key: 'ENUM',
    initialize: function(value) {
        const options = typeof value === 'object' && !Array.isArray(value) && value || {
                values: Array.prototype.slice.call(arguments).reduce((result, element) => {
                    return result.concat(Array.isArray(element) ? element : [element]);
                }, [])
            };
        this.values = options.values;
        this.options = options;
    },
    validate: function(value) {
        if (!_.includes(this.values, value)) {
            throw new Error(value + ' is not a valid choice in ' + this.values);
        }

        return true;
    },
    toSql: function() {
        return 'TEXT';
    },
    Statics: {
        key: 'ENUM',
        types: false
    }
});

const JSONTYPE = AbstractType.extend({
    key: 'JSON',
    initialize: function() {},
    validate: function() {
        return true;
    },
    _stringify: function(value) {
        if (typeof value === 'string') return value;
        return JSON.stringify(value);
    },
    Statics: {
        key: 'JSON',
        types: ['JSON', 'JSONB'],
        parse: function(data) {
            if (data === '') return {};
            return JSON.parse(data);
        }
    }
});

module.exports = {
    DATE,
    DATEONLY,

    STRING,
    TEXT,
    CHAR,

    BLOB,

    NUMBER,
    FLOAT,
    REAL,
    DOUBLE,
    INTEGER,
    BIGINT,

    BOOLEAN,

    ENUM,
    JSONTYPE: JSONTYPE,
    JSON: JSONTYPE,
};