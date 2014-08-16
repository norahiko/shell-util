"use strict";
var sh = require("../lib/shell-util.js");
var assert = require("power-assert");


suite("process", function() {
    test("spawn", function() {
        var res = sh.spawn("cat", ["lib/*.txt"], { encoding: "utf8" });
        assert(res.stdout === "mainutil");
    });


    test("popen", function() {
        sh.env.name = "mike";
        var res = sh.popen("echo hello $name; echo bye $name", { encoding: "utf8" });
        assert(res.stdout === "hello mike\nbye mike\n");
    });
});

