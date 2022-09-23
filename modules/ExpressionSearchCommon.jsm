// Common functions
// MPL2.0
// Opera.Wang 2011/03/21
//Changes for TB 78+ (c) by Klaus Buecher/opto 2020-2021

"use strict";
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
const ADDON_ID = "expressionsearch@opto.one";
var EXPORTED_SYMBOLS = ["ExpressionSearchCommon"];

var ExpressionSearchCommon = {
  // Clone functionality from notifytools and ping the observer directly.
  notifyBackground: function (data) {
    if (ADDON_ID == "") {
      throw new Error("notifyTools: ADDON_ID is empty!");
    }
    return new Promise((resolve) => {
      Services.obs.notifyObservers(
        { data, resolve },
        "NotifyBackgroundObserver",
        ADDON_ID
      );
    });
  },

  showHelpFile: function (url, anchor, createData = { type: "popup", width: 910, height: 750 }) {
    ExpressionSearchCommon.notifyBackground({
      command: "showPage",
      type: "window",
      url, anchor, createData
    });
  },
  openWindow: function (url, anchor, createData = { type: "popup", width: 910, height: 750 }) {
    ExpressionSearchCommon.notifyBackground({
      command: "showPage",
      type: "window",
      url, anchor, createData
    });
  },
  openTab: function (url, anchor, createData = {}) {
    ExpressionSearchCommon.notifyBackground({
      command: "showPage",
      type: "tab",
      url, anchor, createData
    });
  },
  openLinkExternally: function (url) {
    ExpressionSearchCommon.notifyBackground({
      command: "showPage",
      type: "external",
      url
    });
  },
}
