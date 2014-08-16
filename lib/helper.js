"use strict";

var helper = exports;
var fs = require("fs");
var pathModule = require("path");

helper.readdirWithDirname = function(dir) {
    if(dir[dir.length - 1] !== pathModule.sep) {
        dir += pathModule.sep;
    }
    var files = fs.readdirSync(dir);
    var paths = [];
    for(var i = 0; i < files.length; i++) {
        paths.push(dir + files[i]);
    }
    return paths;
};

