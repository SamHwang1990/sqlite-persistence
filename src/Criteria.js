/**
 * Created by zhiyuan.huang@ddder.net.
 */

'use strict';

const CreateClass = require('../classify.js').create;

const Criteria = CreateClass({
    initialize: function() {
        this._select = undefined;
        this._whereCondition = undefined;
        this._whereConditionParams = undefined;

        this._orderBy = undefined;
        this._desc = undefined;
        this._limit = -1;
        this._offset = -1;
        this._distinct = undefined;
    },

    select: function(s) {
        if (!s) return this._select;

        if (_.isEmpty(s)) return this._select;

        this._select = s.toString();
        return this;
    },

    whereCondition: function(w) {
        if (w == undefined) return this._whereCondition;
        this._whereCondition = w.toString();
        return this;
    },

    whereConditionParams: function(p) {
        if (!_.isPlainObject(p)) return this._whereConditionParams;

        this._whereConditionParams = p;
        return this;
    },

    orderBy: function(o) {
        if (o === undefined) return this._orderBy;

        this._orderBy = o;
        return this;
    },

    desc: function(d) {
        if (d === undefined) return this._desc;

        this._desc = !!d;
        return this;
    },

    limit: function(l) {
        if (l === undefined) return this._limit;

        l = parseInt(l);
        if (_.isNaN(l)) {
            l = Infinity;
        }

        this._limit = l;
        return this;
    },

    offset: function(o) {
        if (o === undefined) return this._offset;

        o = parseInt(o);
        if (_.isNaN(o)) {
            o = 0;
        }

        this._offset = o;
        return this;
    },

    distinct: function(d) {
        if (d === undefined) return this._distinct;

        this._distinct = !!d;
        return this;
    },

    applyToSelectQueryCommand: function(queryCommand, tableName) {
        return queryCommand
            .select(this.select(), this.distinct())
            .from(tableName)
            .where(this.whereCondition(), this.whereConditionParams())
            .orderBy(this.orderBy(), this.desc())
            .offset(this.offset())
            .limit(this.limit());
    },

    applyToDeleteQueryCommand: function(queryCommand, tableName) {
        return queryCommand.deleteRow(tableName, this.whereCondition(), this.whereConditionParams());
    }
});

module.exports = Criteria;