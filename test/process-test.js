"use strict";
var sh = require("../lib/shell-util.js");
var assert = require("power-assert");

suite("Spawn:", function() {
    setup(function () {
        sh.mkdir("test/data/proc");
        sh.writeFile("test/data/proc/exec.txt", "exec ");
        sh.writeFile("test/data/proc/proc.txt", "process");
    });


    test("spawn", function() {
        var res = sh.spawn("cat", ["proc/*.txt"], { cwd: "test/data" });
        assert(res.stdout.toString() === "exec process");
    });

    test("popen", function() {
        sh.env.name = "mike";
        var res = sh.popen("echo hello $name; echo bye $name", { encoding: "utf8" });
        assert(res.stdout === "hello mike\nbye mike\n");
    });

    test("expand command", function() {
        var res = sh.popen("echo args **/{exec,proc}.txt", { cwd: "test/data" });
        assert(res.stdout.toString() === "args proc/exec.txt proc/proc.txt\n");
    });
});

