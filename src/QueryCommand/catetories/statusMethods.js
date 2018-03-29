/**
 * Created by zhiyuan.huang@ddder.net.
 */

'use strict';

module.exports = {
    lastInsertRowId: function*() {
        let response = yield this.invoker('lastInsertRowId');

        const errorCode = response.getProperty('error_code');

        if (errorCode && errorCode !== '-1') {
            const errorMsg = response.getProperty('error_msg');
            throw new Error(errorMsg);
        }

        return response.getProperty('data');
    }
};