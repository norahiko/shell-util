"use strict";

var assert = require("assert");
var pathModule = require("path");


exports.expand = function expand(env, format) {
    assert(typeof format === "string", "ShellUtil.expand: arguments[0] must be a String");

    if(format[0] === "'" || format[0] === "\"") {
        return format;
    }
    format = expandHome(env, format);

    if(format.indexOf("$") === -1) {
        return format;
    }
    // e.g. expression = "${varName}" "$varName.attr.attr", "$varName.attr:filter1:filter2"
    var expressionRegexp = /\$[\w.]+(?::\w+)*|\${[\w.]+(?::\w+)*}/g;
    return format.replace(expressionRegexp, function (exp) {
        return expandExpression(env, exp);
    });
};


function expandHome(env, format) {
    if(format === "~" || format === "~/") {
        return env.HOME;
    } else if(format[0] === "~") {
        return env.HOME + pathModule.sep + format.slice(1);
    }
    return format;
}

function expandExpression(env, exp) {
    // trim "$" and "${ }"
    exp = (exp[1] === "{") ? exp.slice(2, -1) : exp.slice(1);

    // extract value and filters from expression
    var filters = exp.split(":");
    var attrs = filters[0].split(".");
    var varName = attrs[0];

    var value;
    if(exports.reservedValues[varName]) {
        value = exports.reservedValues[varName]();
    } else {
        value = env[varName];
    }

    if(value === undefined) {
        throw new Error("ShellUtil.expand: 'env." + varName + "' is not defined");
    }

    value = expandAttributes(value, attrs, varName);
    value = applyFilters(value, filters);
    // apply filter

    if(value instanceof Array) {
        return value.join(" ");
    }
    return value.toString();
}

function expandAttributes(value, attrs, varName) {
    for(var i = 1; i < attrs.length; i++) {
        value = value[attrs[i]];
        if(value === undefined) {
            var errorExpr = varName + "." + attrs.slice(1, i + 1).join(".");
            throw new Error("ShellUtil.expand: 'env." + errorExpr + "' is not defined");
        }
    }
    return value;
}

function applyFilters(value, filters) {
    for(var i = 1; i < filters.length; i++) {
        value = exports.expandFilters[filters[i]](value);
    }
    return value;
}

exports.reservedValues = {
    cwd: function() {
        return process.cwd();
    },
};

exports.expandFilters = {
    abs: pathModule.resolve,
    base: pathModule.basename,
    ext: pathModule.extname,
    dir: pathModule.dirname,
    rmext: function(path) {
        var extLength = pathModule.extname(path).length;
        return extLength ? path.slice(0, -extLength) : path;
    },
    digit1: zeroFillX(1),
    digit2: zeroFillX(2),
    digit3: zeroFillX(3),
    digit4: zeroFillX(4),
    digit5: zeroFillX(5),
    digit6: zeroFillX(6),
    digit7: zeroFillX(7),
    digit8: zeroFillX(8),
};

function zeroFillX(len) {
    var zero = "00000000".slice(0, len);
    return function(num) {
        var sign = "";
        if(num < 0) {
            num = -num;
            sign = "-";
        }
        var digit = (num | 0).toString();
        if(digit.length < len) {
            return sign + (zero + digit).slice(-len);
        }
        return sign + digit;
    };
}
