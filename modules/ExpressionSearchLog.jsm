// Opera Wang, 2010/1/15
// MPL 2.0
// debug utils
// Changes for TB 78+ (c) by Klaus Buecher/opto 2020-2021
"use strict";
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var EXPORTED_SYMBOLS = ["ExpressionSearchLog"];

let ExpressionSearchLog = {
  verbose: false,
  setVerbose: function (verbose) {
    this.verbose = verbose;
  },

  info: function (...msg) {
    if (!this.verbose) return;
    console.info(...msg);
  },

  log: function (...msg) {
    if (!this.verbose) return;
    console.log(...msg);
  },

  logException: function (e) {
    console.error(e);
  },
};
