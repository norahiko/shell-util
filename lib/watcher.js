"use strict";

var assert = require("assert");
var fsutil = require("./fs-util.js");
var fs = require("fs");
var pathModule = require("path");
var underscore = require("underscore");
var globy = require("globy");

var NOTIFY_INTERVAL = 300;
var MAX_DIRECTORY_DEPTH = 6;
var isBSD = process.platform === "freebsd" || process.platform === "darwin";

exports.Watcher = Watcher;


function Watcher(env) {
    this.env = env;
    this.cwd = process.cwd();
    this._targets = [];
    this._watchers = {};
    this._startFrom = Date.now() - 1000;
    this._lastModified = Object.create(null);
    this._closed = false;
    this._watchStartTree(this.cwd);
}

Watcher.prototype.watch = function(patterns, callback) {
    assert(this._closed === false);
    var files = fsutil.glob(this.env, patterns, this.cwd);
    var dirs = underscore.unique(files.map(function(f) {
        return pathModule.dirname(pathModule.resolve(f));
    }));
    this._targets.push(new Target(patterns, this.cwd, callback));
    for(var i = 0; i < dirs.length; i++) {
        this._watchDirectory(dirs[i]);
    }
};

Watcher.prototype._watchStartTree = function() {
    var dirs = findDirectories(this.cwd, MAX_DIRECTORY_DEPTH);
    for(var i = 0; i < dirs.length; i++) {
        this._watchDirectory(dirs[i]);
    }
};

Watcher.prototype._watchDirectory = function(dir) {
    if(dir in this._watchers) return;
    var watcher = this;
    var timers = {};

    function onModify(file) {
        if(isBSD) {
            watcher.onDirectoryModifyBSD(dir);
        } else {
            watcher.onDirectoryModify(dir, file);
        }
    }

    this._watchers[dir] = fs.watch(dir, function(event, file) {
        file = String(file);
        clearTimeout(timers[file]);
        timers[file] = setTimeout(onModify, NOTIFY_INTERVAL, file);
    });
};

Watcher.prototype.onDirectoryModifyBSD = function(dir) {
    var children = fs.readdirSync(dir);
    for(var i = 0; i < children.length; i++) {
        var path = dir + "/" + children[i];
        try {
            var stat = fs.statSync(path);
        } catch(e) {
            continue;
        }
        if(stat.isDirectory()) {
            this._watchDirectory(path);
        } else if(stat.isFile()) {
            var last = this._lastModified[path] || this._startFrom;
            var timestamp = stat.mtime.getTime();
            if(last < timestamp) {
                this._lastModified[path] = timestamp;
                this.notify(path);
            }
        }
    }
};

Watcher.prototype.onDirectoryModify = function(dir, file) {
    if(file === null || fileFilter(file) === false) return;

    var path = pathModule.join(dir, file);
    try {
        var stat = fs.statSync(path);
    } catch(err) {
        // remove event
        return;
    }

    if(stat.isDirectory()) {
        this._watchDirectory(path);
    } else if(stat.isFile()) {
        this.notify(path);
    }
};

Watcher.prototype.notify = function(path) {
    for(var i = 0; i < this._targets.length; i++) {
        if(this._targets[i].match(path)) {
            this._targets[i].callback.call(this);
        }
    }
    if(this._closed) {
        this.targets = null;
    }
};


Watcher.prototype.close = function() {
    for(var file in this._watchers) {
        this._watchers[file].close();
    }

    this.env = null;
    this._watchers = null;
    this._closed = true;
};


function Target(patterns, cwd, callback) {
    if(typeof patterns === "string") patterns = [patterns];
    this.lastModified = Object.create(null);
    this.patterns = patterns.map(function(p) {
        return pathModule.resolve(p);
    });
    this.callback = underscore.debounce(callback, NOTIFY_INTERVAL, true);
}

Target.prototype.match = function(path) {
    for(var i = 0; i < this.patterns.length; i++) {
        if(globy.fnmatch(this.patterns[i], path)) {
            return true;
        }
    }
    return false;
};


function directoryFilter(dir) {
    if(dir === "node_modules") return false;
    if(dir[0] === ".") return false;
    return true;
}

function fileFilter(file) {
    if(file[file.length - 1] === "~") return false;
    return true;
}

function findDirectories(path, depth) {
    var dirs = [];
    path = pathModule.resolve(path);

    function walk(p, depth) {
        if(fs.statSync(p).isDirectory() === false) return;
        dirs.push(p);
        if(depth === 0) return;

        fs.readdirSync(p).forEach(function(d) {
            if(directoryFilter(d)) {
                walk(pathModule.join(p, d), depth - 1);
            }
        });
    }
    walk(path, depth);
    return underscore.unique(dirs);
}
