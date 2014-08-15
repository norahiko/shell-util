"use strict";
var expand = require("./expand.js");

module.exports = new ShellUtil();


function ShellUtil() {
    if(!(this instanceof ShellUtil)) {
        return new ShellUtil();
    }

    var sh = this;
    sh.ShellUtil = ShellUtil;
    sh.env = createEnv();
    sh.expandFilters = expand.expandFilters;
    sh.reservedValues = expand.reservedValues;

    sh.expand = function(format) {
        return expand.expand(sh.env, format);
    };

    sh.glob = function(pattern) {
        return expand.expand(sh.env, pattern);
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
