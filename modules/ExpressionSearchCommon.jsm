// Common functions
// MPL2.0
// Opera.Wang 2011/03/21
//Changes for TB 78+ (c) by Klaus Buecher/opto 2020-2023

"use strict";
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
const ADDON_ID = "expressionsearch@opto.one";
var EXPORTED_SYMBOLS = ["ExpressionSearchCommon"];

var ExpressionSearchCommon = {
  // Clone functionality from notifytools and ping the observer directly.
  registeredCallbacksNextId: 1,
  registeredCallbacks: {},

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
  onNotifyExperimentObserver: {
    observe: async function (aSubject, aTopic, aData) {
      if (ADDON_ID == "") {
        throw new Error("notifyTools: ADDON_ID is empty!");
      }
      if (aData != ADDON_ID) {
        return;
      }
      let payload = aSubject.wrappedJSObject;

      // Make sure payload has a resolve function, which we use to resolve the
      // observer notification.
      if (payload.resolve) {
        let observerTrackerPromises = [];
        // Push listener into promise array, so they can run in parallel
        for (let registeredCallback of Object.values(
          notifyTools.registeredCallbacks
        )) {
          observerTrackerPromises.push(registeredCallback(payload.data));
        }
        // We still have to await all of them but wait time is just the time needed
        // for the slowest one.
        let results = [];
        for (let observerTrackerPromise of observerTrackerPromises) {
          let rv = await observerTrackerPromise;
          if (rv != null) results.push(rv);
        }
        if (results.length == 0) {
          payload.resolve();
        } else {
          if (results.length > 1) {
            console.warn(
              "Received multiple results from onNotifyExperiment listeners. Using the first one, which can lead to inconsistent behavior.",
              results
            );
          }
          payload.resolve(results[0]);
        }
      } else {
        // Older version of NotifyTools, which is not sending a resolve function, deprecated.
        console.log("Please update the notifyTools API to at least v1.5");
        for (let registeredCallback of Object.values(
          notifyTools.registeredCallbacks
        )) {
          registeredCallback(payload.data);
        }
      }
    },
  },

  addListener: function (listener) {
    if (Object.values(this.registeredCallbacks).length == 0) {
      Services.obs.addObserver(
        this.onNotifyExperimentObserver,
        "NotifyExperimentObserver",
        false
      );
    }

    let id = this.registeredCallbacksNextId++;
    this.registeredCallbacks[id] = listener;
    return id;
  },

  removeListener: function (id) {
    delete this.registeredCallbacks[id];
    if (Object.values(this.registeredCallbacks).length == 0) {
      Services.obs.removeObserver(
        this.onNotifyExperimentObserver,
        "NotifyExperimentObserver"
      );
    }
  },

  removeAllListeners: function () {
    if (Object.values(this.registeredCallbacks).length != 0) {
      Services.obs.removeObserver(
        this.onNotifyExperimentObserver,
        "NotifyExperimentObserver"
      );
    }
    this.registeredCallbacks = {};
  },

  //End notifyTools


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
