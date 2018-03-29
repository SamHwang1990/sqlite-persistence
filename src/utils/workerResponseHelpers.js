/**
 * Created by zhiyuan.huang@ddder.net.
 */

'use strict';

const { ResponseDataType } = require('./constants.js');

module.exports = {
    getter: function(response) {
        Object.defineProperties(response, {
            errorMsg: {
                get: function() {
                    return this.getProperty('errorMsg');
                }
            },
            errorCode: {
                get: function() {
                    return this.getProperty('errorCode');
                }
            },
            data: {
                get: function() {
                    let data = this.getProperty('data');
                    let dataType = this.getProperty('dataType');

                    if (!data) return data;

                    if (dataType === ResponseDataType.OBJECT_LIKE) {
                        try {
                            data = JSON.parse(this.getProperty('data'));
                        } catch(e) {
                            // ignore
                        }
                    }

                    return data;
                }
            }
        });
    },

    setter: function(response) {
        Object.defineProperties(response, {
            errorMsg: {
                set: function(msg) {
                    if (typeof msg === 'string') {
                        this.setProperty('error_msg', msg);
                    } else {
                        this.setProperty('error_msg', msg.toString());
                    }
                }
            },
            errorCode: {
                set: function(code) {
                    this.setProperty('error_code', code);
                }
            },
            data: {
                set: function(data) {
                    let dataType = typeof data;
                    let isValueType = data instanceof Value;

                    if (isValueType) {
                        this.setProperty('data', data);
                        this.setProperty('dataType', ResponseDataType.VALUE);
                    } else if (dataType === 'object' || dataType === 'function') {
                        this.setProperty('data', JSON.stringify(data));
                        this.setProperty('dataType', ResponseDataType.OBJECT_LIKE);
                    } else {
                        this.setProperty('data', data);
                        this.setProperty('dataType', ResponseDataType.PRIMITIVE);
                    }
                }
            }
        });
    }
};