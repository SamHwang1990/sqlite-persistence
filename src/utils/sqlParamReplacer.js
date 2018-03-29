/**
 * Created by zhiyuan.huang@ddder.net.
 */

'use strict';

module.exports = function sqlParamReplacer(sqlStr, params) {
    if (!sqlStr) return sqlStr;
    if (!_.isPlainObject(params)) return sqlStr;

    return sqlStr.replace(/:(\w+)/g, (match, p1) => {
        let replaceValue = params.hasOwnProperty(p1) ? params[p1] : match;

        if (!Array.isArray(replaceValue)) {
            replaceValue = [replaceValue];
        }

        return replaceValue.map(v => {
            if (typeof v !== 'number') {
                v = "'" + v + "'";
            }
            return v;
        }).join(',');
    });
};