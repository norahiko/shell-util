"use strict";

var expand = require("./expand.js");
var globy = require("globy");
var runsync = require("runsync");


exports.spawn = function(env, file, args, options) {
    file = expand.expand(env, file);
    options = Object.create(options || null);
    args = expandArgs(env, args, options.cwd);
    return runsync.spawn(file, args, options);
};

exports.popen = function(env, command, options) {
    options = Object.create(options || null);
    command = expandCommand(env, command, options.cwd);
    return runsync.popen(command, options);
};

function expandArgs(env, args, cwd) {
    return flatten(args.map(function(arg) {
        arg = expand.expand(env, arg);
        if(/[[{?*]/.test(arg)) {
            return globy.glob(arg, { dot: false, cwd: cwd });
        }
        return arg;
    }));
}

function expandCommand(env, cmd, cwd) {
    var newCmd = shellSplit(cmd).map(function(token) {
        token = expand.expand(env, token);
        if(token.indexOf("**") === -1) {
            return token;
        }
        return globy.glob(token, { dot: false, cwd: cwd }).join(" ");
    });
    return newCmd.join("");
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
