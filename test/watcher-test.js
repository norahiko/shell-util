"use strict";

var sh = require("../lib/");
var assert = require("power-assert");
var fs = require("fs");

suite("watcher", function() {
    var root = process.cwd();

    setup(function () {
        sh.remove("test/data");
        sh.mkdir("test/data");
        process.chdir("test/data");
        fs.writeFileSync("one.css", "one");
        fs.writeFileSync("two.css", "two");
        fs.writeFileSync("three.txt", "three");
    });

    teardown(function () {
        process.chdir(root);
    });

    test("modify one file", function(done) {
        this.slow(1000);
        sh.watcher().watch("*.css", function() {
            this.close();
            done();
        });
        sh.writeFile("one.css", "changed");
    });

    test("modify two files", function(done) {
        this.slow(1000);
        sh.watcher().watch("*.css", function() {
            this.close();
            done();
        });
        sh.writeFile("one.css", "modified one");
        sh.writeFile("two.css", "modified two");
    });

    test("not modified textfile", function(done) {
        this.slow(2000);
        var watcher = sh.watcher();
        watcher.watch("*.txt", function() {
            done();
            watcher.close();
        });
        watcher.watch("*.css", function() {
            throw new Error();
        });
        fs.writeFileSync("three.txt", "changed three");
    });

    test("modify in new directory", function(done) {
        this.slow(2000);
        var watcher = sh.watcher();
        watcher.watch("newdir/*.css", function() {
            done();
        });

        fs.mkdirSync("newdir");
        setTimeout(function() {
            fs.writeFileSync("newdir/foo.css", "newdir");
        }, 600);
    });

    test("modify twice", function(done) {
        this.slow(3000);
        this.timeout(3000);
        var first = true;
        var count = 0;
        var watcher = sh.watcher();
        watcher.watch("*.css", function() {
            count++;
            if(first) {
                first = false;
            } else {
                assert(count === 2);
                done();
            }
        });

        sh.writeFile("one.css", "modified one");
        setTimeout(function() {
            sh.writeFile("two.css", "modified two");
        }, 1000);
    });
});
