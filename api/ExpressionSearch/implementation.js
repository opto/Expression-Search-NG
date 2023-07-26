var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { ExtensionUtils } = ChromeUtils.import("resource://gre/modules/ExtensionUtils.jsm");
// A helpful class for listening to windows opening and closing.
var { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { QuickFilterManager } = ChromeUtils.import("resource:///modules/QuickFilterManager.jsm");

var resourceUrls = new Set();
var resProto = Cc[
  "@mozilla.org/network/protocol;1?name=resource"
].getService(Ci.nsISubstitutingProtocolHandler);

var sss = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);
var userCSS;

function registerResourceUrl(extension, namespace, folder) {
  const resProto = Cc[
    "@mozilla.org/network/protocol;1?name=resource"
  ].getService(Ci.nsISubstitutingProtocolHandler);

  if (resProto.hasSubstitution(namespace)) {
    throw new ExtensionError(`There is already a resource:// url for the namespace "${namespace}"`);
  }
  let uri = Services.io.newURI(
    folder || ".",
    null,
    extension.rootURI
  );
  resProto.setSubstitutionWithFlags(
    namespace,
    uri,
    resProto.ALLOW_CONTENT_ACCESS
  );
  resourceUrls.add(namespace);
}

var ExpressionSearch = class extends ExtensionCommon.ExtensionAPI {



  searchwinListenerId = "https://github.com/opto/expression-search-NG-Listener";

  onStartup() {
    console.log("Expression Search / Google Mail UI startup...");
    let { extension } = this;

    registerResourceUrl(extension, "expressionsearch");
    userCSS = Services.io.newURI("resource://expressionsearch/skin/overlay.css", null, null);
    let wind = Services.wm.getMostRecentWindow("mail:3pane");


    if (typeof (wind) != "undefined") {
      let prefersDarkMode = wind.matchMedia("(prefers-color-scheme:dark)").matches; //  in  91:    -moz-toolbar-prefers-color-scheme:dark
   //   console.log("dark", prefersDarkMode);
      if (prefersDarkMode)
        userCSS = Services.io.newURI("resource://expressionsearch/skin/overlaydark.css", null, null);
      else
        userCSS = Services.io.newURI("resource://expressionsearch/skin/overlay.css", null, null);
    }
    else userCSS = Services.io.newURI("resource://expressionsearch/skin/overlay.css", null, null);
    /**/
    // install userCSS, works for all document like userChrome.css, see https://developer.mozilla.org/en/docs/Using_the_Stylesheet_Service
    // validator warnings on the below line, ignore it
    if (!sss.sheetRegistered(userCSS, sss.USER_SHEET)) {
      sss.loadAndRegisterSheet(userCSS, sss.USER_SHEET); // will be unregister when shutdown
    }


    //register listener and logic to inject edit field for custom terms into searchWidget
    ExtensionSupport.registerWindowListener(this.searchwinListenerId, {
      chromeURLs: [
        "chrome://messenger/content/SearchDialog.xhtml",
        "chrome://messenger/content/SearchDialog.xul",
      ],


      changeToInp: function (el) {
        var inp = el.ownerGlobal.document.createElement('input');
        inp.classList.add("input-inline", "search-value-input");
        // inp.setAttribute('type', 'text');
        //inp.setAttribute('id', "something");//el.getAttribute('id'));
        inp.setAttribute('searchAttribute', el.getAttribute("searchAttribute"));
        inp.addEventListener("input", (ev) => {
          //     console.log("ev", el, inp);
          el.setAttribute("value", inp.value);
        }, false);
        if (el.children.length == 0) el.appendChild(inp);
      },


      onLoadWindow: function (window) {
  //      console.log("Search opened", window);
        // Select the node that will be observed for mutations
        let termList = window.document.querySelector("#searchTermList")
        // Options for the observer (which mutations to observe)
        let config = { attributes: true, childList: true, subtree: true };

        // Callback function to execute when mutations are observed
        let callback = (mutationList, observer) => {
          for (let mutation of mutationList) {
            if (mutation.type === 'childList') {
              //       console.log('A child node has been added or removed.');
            } else if ((mutation.type === 'attributes') && (mutation.attributeName == "searchAttribute")) {
  //            console.log(`The ${mutation.attributeName} attribute was modified.`, mutation, mutation.target.getAttribute("searchAttribute"));
              //       let nn = window.document.querySelector('[searchAttribute="https://github.com/opto/expression-search-NG-Listener"]');
              //        console.log("node", nn);
              //  if ((mutation.target.nodeName == "input")  && (mutation.target.getAttribute("searchAttribute")!="experiment@sample.extensions.thunderbird.net#implTerm"))  mutation.target.parentNode.removeChild(mutation.target);



              if ((mutation.target.nodeName == "hbox") && (mutation.target.getAttribute("searchAttribute").startsWith("expressionsearch"))) this.changeToInp(mutation.target);



            }
          }

        };

        // Create an observer instance linked to the callback function
        let observer = new window.MutationObserver(callback);

        // Start observing the target node for configured mutations
        observer.observe(termList, config);

      },
    });
  }


  onShutdown(isAppShutdown) {
    ExtensionSupport.unregisterWindowListener(this.searchwinListenerId);
    if (isAppShutdown) {
      return; // the application gets unloaded anyway
    }

    try {
      if (sss.sheetRegistered(userCSS, sss.USER_SHEET)) sss.unregisterSheet(userCSS, sss.USER_SHEET);
    } catch (err) {
      Cu.reportError(err);
    }

    let { ExpressionSearchChrome } = ChromeUtils.import("resource://expressionsearch/modules/ExpressionSearchChrome.jsm");
    try {
      // Unload from any existing windows
      let windows = Services.wm.getEnumerator(null);
      while (windows.hasMoreElements()) {
        let domWindow = windows.getNext();
        // unLoad() knows if the window need unloading or not.
        ExpressionSearchChrome.unLoad(domWindow);
      }
      ExpressionSearchChrome.cleanupPrefs();
    } catch (err) {
      Cu.reportError(err);
    }

    Services.strings.flushBundles();
    QuickFilterManager.killFilter("expression-search-filter");

    // Unload JSMs of this add-on
    for (let module of Cu.loadedModules) {
      let [schema, , namespace] = module.split("/");
      if (schema == "resource:" && resourceUrls.has(namespace)) {
        console.log("Unloading module", module);
        Cu.unload(module);
      }
    }

    // Removing our resource URI
    resourceUrls.forEach(namespace => {
      console.log("Removing resource URI", namespace);
      resProto.setSubstitution(namespace, null);
    });

    Services.obs.notifyObservers(null, "startupcache-invalidate", null);
    Services.obs.notifyObservers(null, "chrome-flush-caches", null);
    console.log("Expression Search / Google Mail UI shutdown");
  }

  getAPI(context) {
    return {
      ExpressionSearch: {
        initPrefs: async function () {
          let { ExpressionSearchChrome } = ChromeUtils.import("resource://expressionsearch/modules/ExpressionSearchChrome.jsm");
          ExpressionSearchChrome.initPrefs();
        },
        getNotes: async function () {
          let { ExpressionSearchChrome } = ChromeUtils.import("resource://expressionsearch/modules/ExpressionSearchChrome.jsm");
          ExpressionSearchChrome.getNotes();
        },
        scrollMessageList: async function (windowId, upDown, select) {
          let { ExpressionSearchChrome } = ChromeUtils.import("resource://expressionsearch/modules/ExpressionSearchChrome.jsm");
          let domWindow = Services.wm.getMostRecentWindow("mail:3pane");// context.extension.windowManager.get(windowId).window;

          ExpressionSearchChrome.selectNextOrPreviousMessage(domWindow, upDown, select);
        },
        setSearchValue: async function (searchValue) {
          //var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
          let wind = Services.wm.getMostRecentWindow("mail:3pane");
//          let focWind = Services.focus.focusedWindow;
          let i = 0;
          if (wind) {
            //let sBox = wind.document.getElementById("expression-search-textbox");
            //sBox.value = "t:kbue s:cha";//searchValue;
  //          console.log("wind", wind, wind.QuickFilterBarMuxer.maybeActiveFilterer, wind.global);
            let filterer = wind.QuickFilterBarMuxer.activeFilterer;
            //let QFM = wind.QuickFilterManager;
            //console.log("after qfb2", MailServices.filters.getCustomTerm("expressionsearch#attachmentNameOrType"), filterer, QFM);
            wind.QuickFilterManager.getDefaultValues();
            filterer.filterValues["expression-search-filter"].text = searchValue;
            wind.QuickFilterBarMuxer.deferredUpdateSearch();
            wind.QuickFilterBarMuxer.reflectFiltererState(
              filterer,
              wind.gFolderDisplay
            );
            let searchBox = wind.document.getElementById("expression-search-textbox");//documentElement
  //          console.log("searchBox", searchBox);
 //           let searchinp = searchBox.getElementsByTagName("input");
 //           console.log("inp", searchinp);
     //       searchinp[0].value = "xnote:bos";
 //           searchBox.inputField.value = "xnote:bos";  //doesn't filter
//            Services.focus.focusedWindow = focWind;

          };


        },
        initWindow: async function (windowId) {
          let { ExpressionSearchChrome } = ChromeUtils.import("resource://expressionsearch/modules/ExpressionSearchChrome.jsm");
          let domWindow = context.extension.windowManager.get(windowId).window;
          ExpressionSearchChrome.Load(domWindow);
        }
      },
    };
  }
};
