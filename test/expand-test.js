"use strict";

var sh = require("../lib/shell-util.js");
var assert = require("power-assert");
var env = sh.env;

suite("Expand tool:", function () {
    env.key = "value";
    env.file = "dir/file.js";
    env.object = {key: [1, 2, ["piyo"]], path: "path.obj"};
    var _cwd = process.cwd;

    setup(function() {
        process.cwd = function() {
            return "/test";
        };
    });

    teardown(function() {
        process.cwd = _cwd;
    });

    test("expand env", function () {
        assert(sh.expand("$key") === "value");
        assert(sh.expand("${key}") === "value");
        assert(sh.expand("/a/$key/b") === "/a/value/b");
        assert(sh.expand("$cwd") === "/test");
        assert(sh.expand("$file") === "dir/file.js");
        assert(sh.expand("~") === process.env.HOME);
        assert(sh.expand("'$file'") === "'$file'");
    });

    test("expand attributes", function() {
        assert(sh.expand("$file.length") === "11");
        assert(sh.expand("${file.length}") === "11");
        assert(sh.expand("$object.key.2.0") === "piyo");
        assert(sh.expand("${object.path:abs}") === "/test/path.obj");
    });

    test("expand filter", function() {
        if(process.platform !== "win32") {
            assert(sh.expand("$file:abs") === "/test/dir/file.js");
            assert(sh.expand("${file:abs}") === "/test/dir/file.js");
        }
        assert(sh.expand("$file:dir") === "dir");
        assert(sh.expand("$file:base") === "file.js");
        assert(sh.expand("$file:rmext") === "dir/file");

        env.num = 0;
        assert(sh.expand("$num:digit2") === "00");

        env.num = 1;
        assert(sh.expand("$num:digit2") === "01");

        env.num = -1;
        assert(sh.expand("$num:digit2") === "-01");

        env.num = 1.234;
        assert(sh.expand("$num:digit2") === "01");

        env.num = 1.9;
        assert(sh.expand("$num:digit2") === "01");

        env.num = -1.9;
        assert(sh.expand("$num:digit2") === "-01");

        env.num = 10;
        assert(sh.expand("$num:digit2") === "10");

        env.num = -10;
        assert(sh.expand("$num:digit2") === "-10");

        env.num = 100;
        assert(sh.expand("$num:digit2") === "100");

        env.num = -100;
        assert(sh.expand("$num:digit2") === "-100");

        env.num = 123;
        assert(sh.expand("$num:digit6") === "000123");
    });

    test("new filter", function() {
        sh.expandFilters.upper = function(str) {
            return str.toUpperCase();
        };
        env.text = "text";
        assert(sh.expand("$text:upper") === "TEXT");
    });

    test("not expanded", function () {
        assert(sh.expand("${key") === "${key");
    });

    test("expand array", function() {
        env.ary = ["foo", "bar", "baz"];
        assert(sh.expand("$ary") === "foo bar baz");
    });

    test("expand error", function() {
        assert.throws(function() {
            sh.expand("$undefined");
        });

        assert.throws(function() {
            sh.expand("$object.undefined");
        });

        assert.throws(function() {
            sh.expand("$PWD:undefined_filter", "value");
        });
    });
});
