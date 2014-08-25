"use strict";

var fs = require("fs");
var root = process.cwd();

exports.setupTestFiles = function setup(sh) {
    sh.env.main = "lib/main.txt";
    sh.env.util = "lib/util.txt";
    var testdir = "test/data";

    /*
    create test files

    test
    └── data (current directory)
        ├── TESTDATA.txt
        ├── bin
        │   └── app
        └── lib
            ├── linkmain  -> main.txt
            ├── main.txt
            └── util.txt
    */
    process.chdir(root);
    sh.remove("test/data", true);
    fs.mkdirSync(testdir);
    process.chdir(testdir);
    fs.writeFileSync("TESTDATA.txt", "testdata");
    // bin
    fs.mkdirSync("bin");
    fs.writeFileSync("bin/app", "app");
    // lib
    fs.mkdirSync("lib");
    fs.writeFileSync("lib/main.txt", "main");
    fs.writeFileSync("lib/util.txt", "util");
    fs.symlinkSync("main.txt", "lib/linkmain");
};


exports.teardownTestFiles = function () {
    process.chdir(root);
};
