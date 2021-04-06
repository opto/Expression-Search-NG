var EXPORTED_SYMBOLS = ["ExpressionSearchChrome"];


var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");

var { ExtensionParent } = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");
var ESextension = ExtensionParent.GlobalManager.getExtension("expressionsearch@opto.one");
console.log("File in es1.js", ESextension.rootURI.resolve("content/es.js"), ExpressionSearchChrome);
var { ExpressionSearchChrome } = ChromeUtils.import(ESextension.rootURI.resolve("content/es.js"));
