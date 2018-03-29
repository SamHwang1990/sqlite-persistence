/**
 * Created by zhiyuan.huang@ddder.net.
 */

'use strict';

const CreateClass = require('../classify.js').create;
const DataTypes = require('./DataTypes.js');

const Record = CreateClass({
    _definitions: null,
    initialize: function() {
        this.definitions = new Map();
        this.entries = new Map();

        if (_.isObject(this._definitions)) {
            this.define(this._definitions);
        }
    },
    define: function(key, options = {}) {
        if (!key) return this;

        if (Array.isArray(key)) {
            key.forEach(k => {
                this.define(k, { name: k });
            });
            return;
        }

        if (_.isObject(key)) {
            Object.keys(key).forEach(k => {
                this.define(k, key[k]);
            });

            return this;
        }

        options.key = key;

        this.definitions.set(key, options);

        return this;
    },
    setValue: function(key, value) {
        if (!key) return;

        this.entries.set(key, value);
        return this;
    },
    getValue: function(key) {
        if (!key) return;
        if (!this.definitions.has(key)) return;
        return this.entries.get(key);
    },
    exportEntry: function() {
        let entries = {};

        this.definitions.forEach((_, key) => {
            entries[key] = this.entries.get(key) || undefined;
        });

        return entries;
    },
    exportForTable: function(tableDict) {
        if (!tableDict) return null;

        let keys = Array.isArray(tableDict) ? Array.from(tableDict) : Object.keys(tableDict);

        let entries = {};
        keys.forEach(key => {
            if (!this.definitions.has(key)) return;

            let value = this.entries.get(key);
            if (value == undefined) return;

            let columnType = tableDict[key];
            if (typeof columnType === 'string') {
                if (DataTypes.hasOwnProperty(columnType)) {
                    columnType = new DataTypes[columnType]();
                } else {
                    columnType = {
                        key: columnType
                    }
                }
            }

            if (columnType.stringify) {
                value = columnType.stringify(value);
            }

            entries[key] = value;
        });

        return entries;
    },
    importEntry: function(entry) {
        Object.keys(entry).forEach(key => {
            this.setValue(key, entry[key]);
        });
        return this;
    },
    mergeRecord: function(record, shouldOverride = false) {
        if (!record) return this;

        let fromEntries = record instanceof Record ? record.exportEntry() : record;

        this.definitions.forEach((_, key) => {
            let fromValue = fromEntries[key];

            if (shouldOverride) {
                this.entries.set(key, fromValue);
            } else {
                if (!this.entries.has(key)) {
                    this.entries.set(key, fromValue);
                }
            }
        });
    }
});

function RecordFactory(definitions) {
    return Record.extend({
        _definitions: definitions
    });
}

module.exports = Record;
module.exports.RecordFactory = RecordFactory;