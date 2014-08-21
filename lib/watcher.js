"use strict";

var EventEmitter = require("events").EventEmitter;
var pathModule = require("path");
var fs = require("fs");

var DEFAULT_NOTIFY_INTERVAL = 50;
var DEFAULT_NOTIFY_DELAY = 30;

exports.Watcher = Watcher;


function Watcher(files, config) {
    EventEmitter.apply(this);
    config = config || {};
    this.files = files;
    this.interval = config.interval || DEFAULT_NOTIFY_INTERVAL;
    this.delay = config.delay | DEFAULT_NOTIFY_DELAY;
    this._lastModifiedTime = {};
    this._watchers = {};
    this._modifiedFiles = [];
    this._wating = false;
    this._watchStart();
}

Watcher.prototype = Object.create(EventEmitter.prototype);

Watcher.prototype._watchStart = function() {
    var watcher = this;

    this._delayNotify = function() {
        watcher._wating = false;
        watcher.emit("change", watcher._modifiedFiles.slice(0));
        watcher._modifiedFiles.length = 0;
    };

    this.files.forEach(function(file) {
        file = pathModule.resolve(file);
        if(fs.statSync(file).isFile() === false) { return; }
        watcher.files.push(file);

        watchStart();
        var w;
        function watchStart() {
            w && w.close();
            w = fs.watch(file, function(event, _) {
                watcher._notify(file);
                watchStart();
            });
            watcher._watchers[file] = w;
        }
    });
};

Watcher.prototype._notify = function(file) {
    var last = this._lastModifiedTime[file] || 0;
    var now = Date.now();
    if(this.interval < now - last) {
        this._lastModifiedTime[file] = now;
        this._modifiedFiles.push(file);
        if(this._wating) { return; }
        this._wating = true;
        setTimeout(this._delayNotify, this.delay);
    }
};

Watcher.prototype.close = function() {
    for(var file in this._watchers) {
        this._watchers[file].close();
    }
};
