/**
 * Created by zhiyuan.huang@ddder.net.
 */

'use strict';

const { safeMetaString, safeSqlEncode: encode } = require('../../utils/safeSql.js');
const stringFormat = require('../../../stringFormat.js');
const sqlParamReplacer = require('../../utils/sqlParamReplacer.js');

module.exports = {
    select: function(columnListString, isDistinct = false) {
        this.resetQueryCommand();

        if (!columnListString) {
            if (isDistinct) {
                this.appendQueryPart('SELECT DISTINCT * ');
            } else {
                this.appendQueryPart('SELECT * ');
            }
        } else {
            if (isDistinct) {
                this.appendFormatQueryPart("SELECT DISTINCT '{}' ", columnListString);
            } else {
                this.appendFormatQueryPart("SELECT '{}' ", columnListString);
            }
        }

        return this;
    },
    from: function(fromListString) {
        return this.appendFormatQueryPart("FROM '{}' ", encode(fromListString));
    },
    where: function(condition, conditionParams) {
        if (!condition) return this;

        return this.appendFormatQueryPart("WHERE {} ", sqlParamReplacer(condition, conditionParams));
    },
    orderBy: function(orderBy, desc = true) {
        if (orderBy == null) return this;

        return this.appendFormatQueryPart("ORDER BY {} ", safeMetaString(orderBy))
            .appendQueryPart(desc ? "DESC " : "ASC ");
    },
    limit: function(limit) {
        if (limit === -1) return this;

        return this.appendFormatQueryPart("LIMIT {} ", limit);
    },
    offset: function(offset) {
        if (offset === -1) return this;

        return this.appendFormatQueryPart("OFFSET {} ", offset);
    },
    countAll: function() {
        this.resetQueryCommand();
        return this.appendQueryPart("SELECT COUNT(*) ");
    }
};