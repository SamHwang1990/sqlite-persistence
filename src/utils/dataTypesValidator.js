'use strict';

const validator = _.cloneDeep(require('../../externals/validator-js/validator.js'));

const extensions = {
  extend: function(name, fn) {
    this[name] = fn;

    return this;
  },
  notEmpty: function(str) {
    return !str.match(/^[\s\t\r\n]*$/);
  },
  len: function(str, min, max) {
    return this.isLength(str, min, max);
  },
  isUrl: function(str) {
    return this.isURL(str);
  },
  isIPv6: function(str) {
    return this.isIP(str, 6);
  },
  isIPv4: function(str) {
    return this.isIP(str, 4);
  },
  notIn: function(str, values) {
    return !this.isIn(str, values);
  },
  regex: function(str, pattern, modifiers) {
    str += '';
    if (Object.prototype.toString.call(pattern).slice(8, -1) !== 'RegExp') {
      pattern = new RegExp(pattern, modifiers);
    }
    return str.match(pattern);
  },
  notRegex: function(str, pattern, modifiers) {
    return !this.regex(str, pattern, modifiers);
  },
  isDecimal: function(str) {
    return str !== '' && !!str.match(/^(?:-?(?:[0-9]+))?(?:\.[0-9]*)?(?:[eE][\+\-]?(?:[0-9]+))?$/);
  },
  min: function(str, val) {
    const number = parseFloat(str);
    return isNaN(number) || number >= val;
  },
  max: function(str, val) {
    const number = parseFloat(str);
    return isNaN(number) || number <= val;
  },
  not: function(str, pattern, modifiers) {
    return this.notRegex(str, pattern, modifiers);
  },
  contains: function(str, elem) {
    return str.indexOf(elem) >= 0 && !!elem;
  },
  notContains: function(str, elem) {
    return !this.contains(str, elem);
  },
  is: function(str, pattern, modifiers) {
    return this.regex(str, pattern, modifiers);
  }
};
exports.extensions = extensions;

function extendModelValidations(modelInstance) {
  const extensions = {
    isImmutable: function(str, param, field) {
      return modelInstance.isNewRecord || modelInstance.dataValues[field] === modelInstance._previousDataValues[field];
    }
  };

  _.forEach(extensions, (extend, key) => {
    validator[key] = extend;
  });
}
exports.extendModelValidations = extendModelValidations;

// Deprecate this.
validator.notNull = function() {
  throw new Error('Warning "notNull" validation has been deprecated in favor of Schema based "allowNull"');
};

// https://github.com/chriso/validator.js/blob/6.2.0/validator.js
_.forEach(extensions, (extend, key) => {
  validator[key] = extend;
});

// map isNull to isEmpty
// https://github.com/chriso/validator.js/commit/e33d38a26ee2f9666b319adb67c7fc0d3dea7125
validator.isNull = validator.isEmpty;

exports.validator = validator;
