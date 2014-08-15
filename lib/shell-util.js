"use strict";
var baseUtil = require("./base-util.js");

module.exports = ShellUtil;


function ShellUtil() {
    if(!(this instanceof ShellUtil)) {
        return new ShellUtil();
    }

    var sh = this;
    sh.ShellUtil = ShellUtil;
    sh.env = createEnv();
    sh.expandFilters = baseUtil.expandFilters;
    sh.reservedValues = baseUtil.reservedValues;

    sh.expand = function(format) {
        return baseUtil.expand(sh.env, format);
    };

}

function createEnv() {
    var env = Object.create(process.env);
    if(process.env.PWD === undefined) {
        env.PWD = process.cwd();
    }
    if(process.env.TMPDIR === undefined) {
        env.TMPDIR = require("os").tmpdir();
    }
    return env;
}
