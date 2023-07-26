//See https://developer.mozilla.org/en/Using_JavaScript_code_modules for explanation
var EXPORTED_SYMBOLS = ["xnote"];
//var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

//Services.scriptloader.loadSubScript("chrome://xnote/content/scripts/notifyTools.js", pub, "UTF-8");

var xnote = {
  ns: {},
  notes: {},
  bookmarks: {},
  XNotesInstalled: false,
  BookmarksInstalled: false,
  test: false//"test"
};


//Services.scriptloader.loadSubScript("chrome://xnote/content/scripts/notifyTools.js", xnote, "UTF-8");


