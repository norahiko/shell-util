"use strict";

var expand = require("./expand.js");
var fsutil = require("./fs-util.js");
var runsync = require("runsync");

exports.spawn = function(env, file, args, options) {
    file = expand.expand(env, file);
    args = expandArgs(env, args);
    options = expandOptions(env, options);
    return runsync.spawn(file, args, options);
};

exports.popen = function(env, command, options) {
    command = expandCommand(env, command);
    options = expandOptions(env, options);
    return runsync.popen(command, options);
};

function expandArgs(env, args) {
    return flatten(args.map(function(arg) {
        return /[*{]/.test(arg) ? fsutil.glob(env, arg) : expand.expand(env, arg);
    }));
}

function expandCommand(env, cmd) {
    var newCmd = shellSplit(cmd).map(function(token) {
        if(token.length === 1 && token !== "*") {
            // shorthand for whitespace or delimiter
            return token;
        }
        token = expand.expand(env, token);
        if(token.indexOf("**") === -1) {
            return token;
        }
        return fsutil.glob(env, token).join(" ");
    });
    return newCmd.join("");
}


function expandOptions(env, options) {
    if(options && options.cwd) {
        options = Object.create(options);
        options.cwd = expand.expand(env, options.cwd);
    }
    return options;
}

function shellSplit(command) {
    return command.match(/\s+|[&|<>]|"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|.(?:\\.|[^\s&|<>])*/g) || [];
}

function isArrayLike(obj) {
    return obj && obj.length !== undefined && typeof obj !== "string";
}


function flatten(arg) {
    if(isArrayLike(arg) === false) {
        return [arg];
    }

    var result = [];
    for(var i = 0; i < arg.length; i++) {
        if(isArrayLike(arg[i])) {
            var sub = flatten(arg[i]);
            for(var k = 0; k < sub.length; k++) {
                result.push(sub[k]);
            }
        } else {
            result.push(arg[i]);
        }
    }
    return result;
}
