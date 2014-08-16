"use strict";
var sh = require("../lib/shell-util.js");
var assert = require("power-assert");
var setups = require("./setup.js");

var fs = require("fs");
var deepEqual = assert.deepEqual;


suite("FileSytem:", function() {
    setup(function () {
        setups.setupTestFiles(sh);
    });

    teardown(function () {
        setups.teardownTestFiles();
    });

    test("glob", function () {
        deepEqual(
            sh.glob("**/*.txt"),
            ["TESTDATA.txt", "lib/main.txt", "lib/util.txt"]
        );
        deepEqual(
            sh.glob("**/cat.jpg"),
            []
        );
        deepEqual(
            sh.glob(["bin/*", "TESTDATA.*"]),
            ["bin/app", "TESTDATA.txt"]
        );
    });

    test("listdir", function() {
        deepEqual(sh.listdir(), ["TESTDATA.txt", "bin", "lib"]);
        assert.notDeepEqual(sh.ls("~"), []);
        deepEqual(sh.ls("~"), sh.ls("$HOME"));
        deepEqual(
            sh.ls("*"),
            ["TESTDATA.txt", "bin/app", "lib/linkmain", "lib/main.txt", "lib/util.txt"]
        );

        assert.throws(function() {
            sh.ls(["*.foo", "*.bar"]);
        }, "sh.listdir");
    });

    test("mkdir", function() {
        sh.mkdir("newdir");
        sh.mkdir("newdir"); // not throws Error
        assert(fs.statSync("newdir").isDirectory());

        sh.mkdir("a/b/c/d/e");
        assert(fs.statSync("a/b/c/d/e").isDirectory());

        assert.throws(function() {
            // not enough arguments
            sh.mkdir();
        }, "sh.expand");

        assert.throws(function() {
            // already a file exists (not directory)
            sh.mkdir("TESTDATA.txt");
        }, "EEXIST");
    });


    test("move", function() {
        // move file
        sh.move("$main", "moved.txt");
        assert(fs.readFileSync("moved.txt", "utf8") === "main");
        assert(sh.notExists("$main"));
        // move file into directory
        sh.move("moved.txt", "bin");
        assert(fs.readFileSync("bin/moved.txt", "utf8") === "main");
        assert(sh.notExists("moved.txt"));
        // move directory
        sh.move("bin", "lib");
        assert(fs.readFileSync("lib/bin/moved.txt", "utf8") === "main");
        assert(sh.notExists("bin"));

        assert.throws(function() {
            // not enough arguments
            sh.move("TESTDATA.txt");
        }, "sh.expand");

        assert.throws(function () {
            // source is not exists
            sh.move("not_exists_file", "foo");
        }, "sh.move");

        assert.throws(function () {
            // move current directory
            sh.move("./", "lib");
        });
        assert.throws(function () {
            // move directory into self
            sh.move("lib", "lib");
        });
    });

    test("move files", function() {
        sh.move("lib/*.txt", "bin");
        deepEqual(fs.readdirSync("bin"), ["app", "main.txt", "util.txt"]);
    });

    test("copy", function() {
        sh.copy("$main", "lib/copy.txt");
        assert(fs.readFileSync("lib/copy.txt").toString() === "main");
        sh.copy("lib", "copylib");
        assert(fs.readFileSync("copylib/main.txt").toString() === "main");
        assert(sh.exists("$main"));
        assert(sh.exists("$util"));

        sh.copy("lib", "copylib");
        assert(fs.readFileSync("copylib/lib/main.txt").toString() === "main");

        assert.throws(function() {
            // not enough arguments
            sh.copy("TESTDATA.txt");
        }, "sh.expand");

        assert.throws(function() {
            // copy directory to file
            sh.copy("lib", "TESTDATA.txt");
        });
    });

    test("copy link", function() {
        fs.mkdirSync("pack");
        fs.symlinkSync("lib", "linkdir");

        sh.copy(["bin", "lib", "linkdir"], "pack");
        assert(fs.lstatSync("pack/lib/linkmain").isSymbolicLink());
        assert(fs.readFileSync("pack/lib/linkmain", "utf8") === "main");

        assert(fs.lstatSync("pack/linkdir").isSymbolicLink());
        assert(fs.readFileSync("pack/linkdir/main.txt", "utf8") === "main");

        // replace link
        sh.copy("linkdir", "lib/linkmain");
        assert(fs.readlinkSync("lib/linkmain") === "lib");
    });

    test("copy files", function() {
        sh.copy(["$main", "$util"], "bin");
        assert(fs.readFileSync("bin/main.txt").toString() === "main");
        assert(fs.readFileSync("bin/util.txt").toString() === "util");
    });

    test("remove", function() {
        sh.remove("lib/main.txt");
        assert(fs.existsSync("lib/main.txt") === false);

        assert.doesNotThrow(function() {
            sh.remove("not_exists_file");
        });
    });

    test("readFile", function() {
        assert(sh.readFile("$main", "utf8") === "main");
    });

    test("writeFile", function() {
        sh.writeFile("$main", "new text");
        assert(sh.readFile("$main", "utf8") === "new text");
    });

    test("appendFile", function() {
        sh.appendFile("$main", "1");
        sh.appendFile("$main", "2");
        assert(sh.readFile("$main").toString() === "main12");
    });

    test("prependFile", function() {
        sh.prependFile("$main", "2");
        sh.prependFile("$main", "1");
        assert(sh.readFile("$main").toString() === "12main");
    });

    test("replace", function() {
        var contents = [];
        sh.replace("TESTDATA.txt", /.+/g, function(match) {
            contents.push(match);
            return "replaced";
        });

        sh.replace("TESTDATA.txt", /replaced/g, function (match) {
            contents.push(match);
            return "testdata";
        });
        deepEqual(contents, ["testdata", "replaced"]);
    });

    test("concat", function() {
        assert(sh.concat(["lib/*.txt"], "\n", "utf8") === "main\nutil");
        assert(sh.concat("not_exists_file").toString() === "");
    });

    test("tempfile", function() {
        var path = sh.tempfile("temp text");
        assert(sh.readFile(path, "utf8") === "temp text");
    });

    test("modified", function() {
        assert(sh.modified("lib/*.txt", "../../README.md"));
        assert(sh.modified("../../README.md", "$main") === false);
        assert(sh.modified("lib", "not_exists_file"));
        assert.throws(function () {
            sh.modified("not_exists_file", "foo");
        });
    });
});
