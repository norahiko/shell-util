var sh = require("../lib/shell-util.js");
var assert = require("power-assert");
var pathModule = require("path");
var fs = require("fs");

suite("watcher", function() {
    var root = process.cwd();

    setup(function () {
        sh.mkdir("test/data");
        process.chdir("test/data");
        fs.writeFileSync("one.css", "one");
        fs.writeFileSync("two.css", "two");
    });

    teardown(function () {
        process.chdir(root);
    });

    test("modify one file", function(done) {
        sh.watcher("*.css").on("change", function(modified) {
            this.close();
            assert(modified.length === 1);
            assert(modified[0] === pathModule.resolve("one.css"));
            assert(fs.readFileSync(modified[0]).toString() === "modified");
            done();
        });
        sh.writeFile("one.css", "modified");
    });

    test("modify two files", function(done) {
        sh.watcher("*.css").on("change", function(modified) {
            this.close();
            assert(modified.length === 2);
            assert(modified[0] === pathModule.resolve("one.css"));
            assert(modified[1] === pathModule.resolve("two.css"));
            assert(fs.readFileSync(modified[0]).toString() === "modified one");
            assert(fs.readFileSync(modified[1]).toString() === "modified two");
            done();
        });
        sh.writeFile("one.css", "modified one");
        sh.writeFile("two.css", "modified two");
    });

    test("modify twice", function(done) {
        this.slow(500);

        var first = true;
        sh.watcher("*.css", { delay: 0, interval: 0 }).on("change", function(modified) {
            assert(modified.length === 1);
            assert(modified[0] === pathModule.resolve("one.css"));

            if(first) {
                first = false;
                return;
            }
            this.close();
            done();
        });

        sh.writeFile("one.css", "once");
        setTimeout(function() {
            sh.writeFile("one.css", "twice");
        }, 200);
    });
});
