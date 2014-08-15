"use strict";

var sh = require("../lib/index.js");

var assert = require("chai").assert;
var equal = assert.strictEqual;
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
        equal(sh.expand("$key"), "value");
        equal(sh.expand("${key}"), "value");
        equal(sh.expand("/a/$key/b"), "/a/value/b");
        equal(sh.expand("$cwd"), "/test");
        equal(sh.expand("$file"), "dir/file.js");
        equal(sh.expand("~"), process.env.HOME);
    });

    test("expand attributes", function() {
        equal(sh.expand("$file.length"), "11");
        equal(sh.expand("${file.length}"), "11");
        equal(sh.expand("$object.key.2.0"), "piyo");
        equal(sh.expand("${object.path:abs}"), "/test/path.obj");
    });

    test("expand filter", function() {
        if(process.platform !== "win32") {
            equal(sh.expand("$file:abs"), "/test/dir/file.js");
            equal(sh.expand("${file:abs}"), "/test/dir/file.js");
        }
        equal(sh.expand("$file:dir"), "dir");
        equal(sh.expand("$file:base"), "file.js");
        equal(sh.expand("$file:rmext"), "dir/file");

        env.num = 0;
        equal(sh.expand("$num:digit2"), "00");

        env.num = 1;
        equal(sh.expand("$num:digit2"), "01");

        env.num = -1;
        equal(sh.expand("$num:digit2"), "-01");

        env.num = 1.234;
        equal(sh.expand("$num:digit2"), "01");

        env.num = 1.9;
        equal(sh.expand("$num:digit2"), "01");

        env.num = -1.9;
        equal(sh.expand("$num:digit2"), "-01");

        env.num = 10;
        equal(sh.expand("$num:digit2"), "10");

        env.num = -10;
        equal(sh.expand("$num:digit2"), "-10");

        env.num = 100;
        equal(sh.expand("$num:digit2"), "100");

        env.num = -100;
        equal(sh.expand("$num:digit2"), "-100");

        env.num = 123;
        equal(sh.expand("$num:digit6"), "000123");
    });

    test("new filter", function() {
        sh.expandFilters.upper = function(str) {
            return str.toUpperCase();
        };
        env.text = "text";
        equal(sh.expand("$text:upper"), "TEXT");
    });

    test("not expanded", function () {
        equal(sh.expand("${key"), "${key");
    });

    test("expand array", function() {
        env.ary = ["foo", "bar", "baz"];
        equal(sh.expand("$ary"), "foo bar baz");
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
