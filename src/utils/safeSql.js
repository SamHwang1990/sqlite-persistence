/**
 * Created by zhiyuan.huang@ddder.net.
 */

'use strict';

module.exports = {
    safeMetaString: function(str) {
        return str.split(/['`]/g).join('');
    },
    safeSqlEncode: function(str) {
        return str.toString().replace(/'/g, "''");
    }
};