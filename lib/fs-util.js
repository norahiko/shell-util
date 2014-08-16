"use strict";

var expand = require("./expand.js");
var assert = require("assert");
var fs = require("fs");
var globy = require("globy");
var pathModule = require("path");

var globOptionDot = { dot: true };


exports.glob = function glob(env, pattern) {
    var patterns = [];
    if(typeof pattern === "string") {
        patterns.push(expand.expand(env, pattern));
    } else {
        for(var i = 0; i < pattern.length; i++) {
            patterns.push(expand.expand(env, pattern[i]));
        }
    }

    var paths = [];
    for(i = 0; i < patterns.length; i++) {
        var ptn = patterns[i];
        if(/[[{?*]/.test(ptn)) {
            var matched = globy.glob(ptn, { dot: true });
            for(var m = 0; m < matched.length; m++) {
                paths.push(matched[m]);
            }
        } else if(fs.existsSync(ptn)) {
            paths.push(ptn);
        }
    }
    return paths;
};

exports.listdir = function listdir(env, pattern) {
    if(! pattern) {
        return fs.readdirSync("./");
    }

    var files = [];
    var subfiles = [];

    exports.glob(env, pattern).forEach(function(file) {
        if(fs.statSync(file).isDirectory()) {
            var sub = globy.glob(file + "/*", globOptionDot);
            subfiles.push.apply(subfiles, sub);
        } else {
            files.push(file);
        }
    });

    if(files.length === 0 && subfiles.length === 0) {
        throw new Error("ShellUtil.listdir: '" + pattern + "' no such file or directory");
    }
    return files.concat(subfiles);


};

exports.which = function(env, file) {
    file = expand.expand(env, file);
    var pathdirs = env.PATH.split(pathModule.delimiter);

    for(var i = 0; i < pathdirs.length; i++) {
        var path = pathModule.join(pathdirs[i], file);
        try {
            if(fs.statSync(path).mode & 64) {
                return path;
            }
        } catch(_) { }
    }
    return null;
};

exports.mkdir = function(dirname) {
    try {
        if(fs.statSync(dirname).isDirectory()) {
            return;
        }
    } catch(err) {
        if(err.code !== "ENOENT") {
            throw err;
        }
        exports.mkdir(pathModule.dirname(dirname));
        fs.mkdirSync(dirname);
        return;
    }
    var err = new Error("EEXIST, file already exists \"" + dirname + "\"");
    err.code = "EEXIST";
    throw err;
};

exports.move = function(env, src, dest) {
    dest = expand.expand(env, dest);
    var files = exports.glob(env, src);

    switch(files.length) {
        case 0: throw new Error("ShellUtil.move: '" + src + "' no such file or directory");
        case 1: moveFile(files[0], dest); break;
        default: moveFilesToDir(files, dest);
    }
};



function moveFile(src, dest) {
    try {
        if(fs.statSync(dest).isDirectory()) {
            // move into directory
            var basename = pathModule.basename(src);
            var newpath = pathModule.join(dest, basename);
            fs.renameSync(src, newpath);
            return;
        }
    } catch(err) {
        if(err.code !== "ENOENT") { throw err; }
    }
    fs.renameSync(src, dest);
}

function moveFilesToDir(paths, dir) {
    try {
        var stat = fs.statSync(dir);
    } catch(e) {}

    if(stat === undefined || stat.isDirectory() === false) {
        throw new Error("'" + dir + "'" + " is not a directory");
    }

    paths.forEach(function(src) {
        var filename = pathModule.basename(src);
        var dest = pathModule.join(dir, filename);
        fs.renameSync(src, dest);
    });
}

exports.copy = function(env, pattern, dest) {
    dest = expand.expand(env, dest);
    var files = exports.glob(env, pattern);
    if(files.length === 0) {
        throw new Error("ShellUtil.copy: '" + pattern + "' no such file or directory");
    }

    try {
        var stat = fs.statSync(dest);
    } catch(err) {
        if(err.code !== "ENOENT") { throw err; }
    }

    var destIsDir = !!stat && stat.isDirectory();
    if(1 < files.length && destIsDir === false) {
        throw new Error("ShellUtil.copy: '" + dest + "' is not a directory");
    }

    files.forEach(function(src) {
        var dst = dest;
        if(destIsDir) {
            var basename = pathModule.basename(src);
            dst = pathModule.join(dest, basename);
        }
        copyAny(src, dst);
    });
};


function copyAny(src, dest) {
    var stat = fs.lstatSync(src);
    switch(true) {
        case stat.isFile(): copyFile(src, dest); break;
        case stat.isDirectory(): copyDirectory(src, dest); break;
        case stat.isSymbolicLink(): copyLink(src, dest); break;
        // ignore other types
    }
}

function copyFile(src, dest) {
    var srcfd = fs.openSync(src, "r");
    var destfd = fs.openSync(dest, "w");
    var bufsize = 8192;
    var buffer = new Buffer(bufsize);

    try {
        while(true) {
            var readSize = fs.readSync(srcfd, buffer, 0, bufsize);
            if(readSize === 0) {
                break;
            }
            fs.writeSync(destfd, buffer, 0, readSize);
        }
    } finally {
        fs.closeSync(srcfd);
        fs.closeSync(destfd);
    }
}

function copyDirectory(srcDir, destDir) {
    try {
        fs.mkdirSync(destDir);
    } catch(err) {
        if(err.code !== "EEXIST") { throw err; }
    }

    var files = fs.readdirSync(srcDir);
    if(srcDir.charAt(srcDir.length - 1) !== pathModule.sep) {
        srcDir += pathModule.sep;
    }

    for(var i = 0; i < files.length; i++) {
        var srcPath = srcDir + files[i];
        var destPath = destDir + pathModule.sep + files[i];
        copyAny(srcPath, destPath);
    }
}

function copyLink(src, dest) {
    var link = fs.readlinkSync(src);
    try {
        fs.symlinkSync(link, dest);
    } catch(err) {
        if(err.code !== "EEXIST") { throw err; }
        fs.unlinkSync(dest);
        fs.symlinkSync(link, dest);
    }
}

exports.removeTree = function(path) {
    if(fs.lstatSync(path).isDirectory()) {
        var files = globy.glob(path + "/*", globOptionDot);
        files.forEach(exports.removeTree);
        fs.rmdirSync(path);
    } else {
        fs.unlinkSync(path);
    }
};

exports.modified = function (env, pattern, dest) {
    var files = exports.glob(env, pattern);
    if(files.length === 0) {
        throw new Error("ShellUtil.modified: '" + pattern + "' no such file or directory");
    }
    dest = expand.expand(env, dest);

    try {
        var destTime = fs.statSync(dest).mtime.getTime();
    } catch(e) {
        return true;
    }

    var latestSrcTime = files.map(function(file) {
        return fs.statSync(file).mtime.getTime();
    }).sort(function(a, b) { return b - a })[0];

    return destTime < latestSrcTime;
};

exports.prependFile = function(file, data) {
    if(Buffer.isBuffer(data) === false) {
        data = new Buffer(data);
    }

    var originalData = fs.readFileSync(file);
    var fd = fs.openSync(file, "w");
    fs.writeSync(fd, data, 0, data.length);
    fs.writeSync(fd, originalData, 0, originalData.length);
    fs.closeSync(fd);
};

exports.replace = function(env, pattern, regex, str) {
    assert(regex instanceof RegExp, "ShellUtil.replace: arguments[1] must be a RegExp");
    assert(regex.global, "ShellUtil.replace: RegExp needs global flag (for example: /foo/g )");

    var files = exports.glob(env, pattern);
    if(files.length === 0) {
        throw new Error("ShellUtil.replace: '" + pattern + "' no such file or directory");
    }

    files.forEach(function(file) {
        var content = fs.readFileSync(file).toString();
        var newContent = content.replace(regex, str);
        if(content !== newContent) {
            fs.writeFileSync(file, newContent);
        }
    });
};

exports.concat = function (env, pattern, sep, encoding) {
    if(sep === undefined) {
        sep = new Buffer(0);
    } else if(Buffer.isBuffer(sep) === false) {
        sep = new Buffer(sep);
    }

    var files = exports.glob(env, pattern);
    var buffers = [];
    files.forEach(function(file) {
        buffers.push(fs.readFileSync(file));
        buffers.push(sep);
    });
    buffers.pop(); // remove trailing separator

    var result = Buffer.concat(buffers);
    if(encoding) {
        return result.toString(encoding);
    }
    return result;
};

exports.tempfile = function(env, data) {
    var filename = "temp" + Date.now() + "_" + Math.random().toString().slice(2);
    var path = pathModule.join(env.TMPDIR, filename);
    fs.writeFileSync(path, data || "");
    return path;
};
