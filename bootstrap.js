// Opera.Wang+expressionsearch@gmail.com GPL/MPL
//Changes for TB 78+ (c) by Klaus Buecher/opto 2020-2021
"use strict";

////debugger;
//var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
// if use custom resouce, refer here
// http://mdn.beonex.com/en/JavaScript_code_modules/Using.html
var { ExpressionSearchChrome } = ChromeUtils.import("chrome://expressionsearch/content/es.js");
var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");

var { ExtensionParent } = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");
var ESextension = ExtensionParent.GlobalManager.getExtension("expressionsearch@opto.one");
//console.log("bootstrap-File", ESextension.rootURI.resolve("content/es.js"));
//var { ExpressionSearchChrome } = ChromeUtils.import(ESextension.rootURI.resolve("content/es.js"));

//console.log("ExpressionSearchChrome", ExpressionSearchChrome);
var scriptURL = ESextension.rootURI.resolve("content/es.js");
async function load_es(scriptURL, window) {
  console.log("load_es-File", scriptURL);
  let context = window.document.defaultView;
  let script = await ChromeUtils.compileScript(scriptURL);
  script.executeInGlobal(context, window);
}


const sss = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);
const userCSS = Services.io.newURI("resource://expressionsearch/skin/overlay.css", null, null);
//console.log("Css", userCSS);
const targetWindows = ["mail:3pane", "mailnews:virtualFolderList"];
const observeEvent = "xul-window-registered";


/*

var tabMonitor = {
  onTabTitleChanged(aTab) {},
  onTabClosing(aTab) {},
  onTabPersist(aTab) {},
  onTabRestored(aTab) {},
  onTabSwitched(aNewTab, aOldTab) {
    console.log("old Type: ",aOldTab.mode.type  , "new type: ",aNewTab.mode.type  )
  },
  async onTabOpened(aTab) {}
  
  
}; 

*/

async function loadIntoWindow(window) {
//  console.log(" start loadIntoWindow");
  if (!window) return; // windows is the global host context

  let context = window.document.defaultView;
  let document = window.document; // XULDocument
  let type = document.documentElement.getAttribute('windowtype'); // documentElement maybe 'messengerWindow' / 'addressbookWindow'
  if (targetWindows.indexOf(type) < 0) return;
  //if (type = "mail:3pane") {
  /*    let tabmail = window.document.getElementById("tabmail");
    if (tabmail)                  tabmail.registerTabMonitor(tabMonitor);
   // }
    let tab = tabmail.selectedTab;
    console.log("window", window, "windowtype", window.windowtype, "document", window.document, "documentElement", window.document.documentElement, "type", tabmail.currentTabInfo.mode.type, "tabmail", tabmail, "tab", tab, "tab type", tab.type);
  */
//  console.log("loadinto window for correct type");
  let tabmail = window.document.getElementById("tabmail");
  //  if (tabmail)                  tabmail.registerTabMonitor(tabMonitor);
  /**/
  if (!window.es_loaded) {
 //   console.log("load_es-File", scriptURL);
 //   let script = await ChromeUtils.compileScript(scriptURL);
    //script.executeInGlobal(context, window);
 //   console.log("nach load_es");
    window.es_loaded = true;
  };

  //window.ExpressionSearchChrome.init(); // will and add my filter, and TB want the domID exists when filter registered, so only called when have window ready
  //window.ExpressionSearchChrome.Load(window);
  ExpressionSearchChrome.init(); // will and add my filter, and TB want the domID exists when filter registered, so only called when have window ready
  ExpressionSearchChrome.Load(window);
}

/*
var tabMonitor = {
  onTabTitleChanged(aTab) {},
  onTabClosing(aTab) {},
  onTabPersist(aTab) {},
  onTabRestored(aTab) {},
  onTabSwitched(aNewTab, aOldTab) {console.log("tabType", aNewTab.mode.type)},
  async onTabOpened(aTab) {
    if (aTab.mode.type =="folder") {
      console.log("tab opened: ", aTab.mode.type);
      ExpressionSearchChrome.init(); // will and add my filter, and TB want the domID exists when filter registered, so only called when have window ready
      ExpressionSearchChrome.Load(window);
        
    }
  }
  
  
}; 

function loadIntoTab(window) {
  if ( !window ) return; // windows is the global host context
  let document = window.document; // XULDocument
  let type = document.documentElement.getAttribute('windowtype'); // documentElement maybe 'messengerWindow' / 'addressbookWindow'
  
  //  let tab = this.tabmail.selectedTab;
  if (type == "mail:3pane") {
    let tabmail = window.document.getElementById("tabmail");
    let tab = this.tabmail.selectedTab;
    console.log(tab.type);
  //ExpressionSearchChrome.init(); // will and add my filter, and TB want the domID exists when filter registered, so only called when have window ready
 // ExpressionSearchChrome.Load(window);
}
}
 
*/





var windowListener = {
  onOpenWindow: function (aWindow) {
    let onLoadWindow = function () {
      aWindow.removeEventListener("DOMContentLoaded", onLoadWindow, false);
      loadIntoWindow(aWindow);
    };
    aWindow.addEventListener("DOMContentLoaded", onLoadWindow, false);
  },
  observe: function (subject, topic, data) {
    if (topic == observeEvent) {
      windowListener.onOpenWindow(subject.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindow));
    }
  }
};

// A toplevel window in a XUL app is an nsXULWindow.  Inside that there is an nsGlobalWindow (aka nsIDOMWindow).
function startup(aData, aReason) {
  console.log("Expression Search / Google Mail UI startup...");
  //  var {ExpressionSearchChrome} = ChromeUtils.import("chrome://expressionsearch/content/es.js");
  let windows = Services.wm.getEnumerator(null);
//  console.log("windows", windows);
  while (windows.hasMoreElements()) {
    //    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    let domWindow = windows.getNext();
//    console.log("domWindow", domWindow);
    //    load_es(scriptURL, domWindow);
    //    console.log("nach load_es");
    if (domWindow.document.readyState == "complete" && targetWindows.indexOf(domWindow.document.documentElement.getAttribute('windowtype')) >= 0) {
      //debugger;
//      console.log("readystate complete");
      loadIntoWindow(domWindow);
    } else {
      windowListener.onOpenWindow(domWindow);
    }
  }
  // Wait for new windows
  Services.obs.addObserver(windowListener, observeEvent, false);
  //Services.wm.addListener(WindowListener2);

  // install userCSS, works for all document like userChrome.css, see https://developer.mozilla.org/en/docs/Using_the_Stylesheet_Service
  // validator warnings on the below line, ignore it
  if (!sss.sheetRegistered(userCSS, sss.USER_SHEET)) sss.loadAndRegisterSheet(userCSS, sss.USER_SHEET); // will be unregister when shutdown
  //console.log("end startup");
}

function shutdown(aData, aReason) {
  // When the application is shutting down we normally don't have to clean up any UI changes made
  //console.log("bootstrap shutdown", (aReason == APP_SHUTDOWN));
  if (aReason == APP_SHUTDOWN) return;

  try {
    if (sss.sheetRegistered(userCSS, sss.USER_SHEET)) sss.unregisterSheet(userCSS, sss.USER_SHEET);
  } catch (err) { Cu.reportError(err); }

  try {
    Services.obs.removeObserver(windowListener, observeEvent);
  } catch (err) { Cu.reportError(err); }


  try {
    Services.obs.notifyObservers(null, "startupcache-invalidate", null); //ADDON_DISABLE ADDON_UNINSTALL ADDON_UPGRADE ADDON_DOWNGRADE
    // Unload from any existing windows
    let windows = Services.wm.getEnumerator(null);
    while (windows.hasMoreElements()) {
      let winInterface = windows.getNext();//.QueryInterface(Ci.nsIInterfaceRequestor);
      let domWindow = winInterface.getInterface(Ci.nsIDOMWindow);
      let windowUtils = domWindow.windowUtils || winInterface.getInterface(Ci.nsIDOMWindowUtils);
      ExpressionSearchChrome.unLoad(domWindow); // won't check windowtype as unload will check
      // Do CC & GC, comment out allTraces when release
      windowUtils.garbageCollect(
        // Cc["@mozilla.org/cycle-collector-logger;1"].createInstance(Ci.nsICycleCollectorListener).allTraces()
      );
    }
    ExpressionSearchChrome.cleanup();
  } catch (err) { Cu.reportError(err); }
  Services.strings.flushBundles(); // clear string bundles
  ["aop", "log"].forEach(function (file) {
    Cu.unload("chrome://expressionsearch/content/" + file + ".js");
  });
  try {
    ExpressionSearchChrome = null;
  } catch (err) { Cu.reportError(err); }
  Services.obs.notifyObservers(null, "startupcache-invalidate", null); //ADDON_DISABLE ADDON_UNINSTALL ADDON_UPGRADE ADDON_DOWNGRADE
  Services.obs.notifyObservers(null, "chrome-flush-caches", null);
  Cu.schedulePreciseGC(Cu.forceGC);
  Services.console.logStringMessage("Expression Search / Google Mail UI shutdown");
}

function install(aData, aReason) { }
function uninstall(aData, aReason) { }
