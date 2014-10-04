"use strict";

var expand = require("./expand.js");
var fsutil = require("./fs-util.js");
var psutil = require("./process-util.js");
var watcher = require("./watcher.js");

var fs = require("fs");
var pathModule = require("path");

module.exports = new ShellUtil();


function ShellUtil() {
    var sh = this;
    sh.ShellUtil = ShellUtil;
    sh.env = createEnv();
    sh.expandFilters = expand.expandFilters;
    sh.reservedValues = expand.reservedValues;

    function exp(format) {
        return expand.expand(sh.env, format);
    }

    sh.expand = exp;

    // path utility

    sh.glob = function(pattern, cwd) {
        return fsutil.glob(sh.env, pattern);
    };

    sh.ls = sh.listdir = function(pattern) {
        return fsutil.listdir(sh.env, pattern);
    };

    sh.cwd = function() {
        return process.cwd();
    };

    sh.abspath = function(path) {
        return pathModule.resolve(path);
    };

    sh.cd = sh.chdir = function(path) {
        process.chdir(exp(path));
    };

    sh.exists = function(path) {
        return fs.existsSync(exp(path));
    };

    sh.notExists = function(path) {
        return ! sh.exists(path);
    };

    sh.which = function(file) {
        return fsutil.which(sh.env, file);
    };


    // filesystem utility

    sh.mkdir = function(dirname) {
        fsutil.mkdir(exp(dirname));
    };

    sh.mv = sh.move = function(src, dest) {
        fsutil.move(sh.env, src, dest);
    };

    sh.cp = sh.copy = function(src, dest) {
        fsutil.copy(sh.env, src, dest);
    };

    sh.rm = sh.remove = function(pattern, removeDir) {
        var files = sh.glob(pattern);
        fsutil.remove(files, removeDir);
    };

    sh.modified = function(pattern, dest) {
        return fsutil.modified(sh.env, pattern, dest);
    };


    // edit util

    sh.readFile = function(file, encoding) {
        return fs.readFileSync(exp(file), encoding);
    };

    sh.writeFile = function (file, data, options) {
        fs.writeFileSync(exp(file), data, options);
    };

    sh.appendFile = function(file, data) {
        sh.writeFile(file, data, { flag: "a" });
    };

    sh.prependFile = function(file, data) {
        fsutil.prependFile(exp(file), data);
    };

    sh.replace = function(pattern, regex, str) {
        fsutil.replace(sh.env, pattern, regex, str);
    };

    sh.cat = sh.concat = function(pattern, sep, encoding) {
        return fsutil.concat(sh.env, pattern, sep, encoding);
    };

    sh.tempfile = function(data) {
        return fsutil.tempfile(sh.env, data);
    };


    // process util


    sh.spawn = function(file, args, options) {
        return psutil.spawn(sh.env, file, args, options);
    };

    sh.popen = function (command, options) {
        return psutil.popen(sh.env, command, options);
    };

    // watcher

    sh.watcher = function() {
        return new watcher.Watcher(sh.env);
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
