/*
 * MPL2
 * Copyright: Klaus Buecher/opto 2021 (except Thunderbird Experiment example code)
 */



var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { ExtensionUtils } = ChromeUtils.import("resource://gre/modules/ExtensionUtils.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { QuickFilterManager } = ChromeUtils.import("resource:///modules/QuickFilterManager.jsm");





let Ci = Components.interfaces;
/**/


/*
//unused, already registered elsewhere

var resourceUrls = new Set();

var resProto = Cc[
  "@mozilla.org/network/protocol;1?name=resource"
].getService(Ci.nsISubstitutingProtocolHandler);

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
};

*/

let repButton = null;


function init_qfbNotRepliedButton(wind) {
  //console.log("notreplied win", wind, Ci.nsMsgMessageFlags.Replied);
  let hbox = wind.document.getElementById("quick-filter-bar-collapsible-buttons");
  repButton = wind.document.createXULElement("toolbarbutton");
  repButton.id = "exp-search-qfb-unreplied";
  repButton.setAttribute("type", "checkbox");
  repButton.setAttribute("label", "Unreplied");
  repButton.setAttribute("tooltiptext", "Filter for unreplied messages");
  repButton.setAttribute("crop", "none");
  repButton.setAttribute("image", "resource://expressionsearch/skin/noreply1black.svg");
  repButton.class = "toolbarbutton-1";
  repButton.setAttribute("style", "min-width:16px");
  hbox.appendChild(repButton);


};




function defineFilterNotReplied(wind) {

  // this is inspired by Philip Kewisch and originally copied from QFM, but adjusted for nsMsgMessageFlags.Replied 

  QuickFilterManager.defineFilter({
    name: "expression-search-unreplied",
    domId: "exp-search-qfb-unreplied",
    appendTerms(aTermCreator, aTerms, aFilterValue) {
      let term, value;
      term = aTermCreator.createTerm();
      term.attrib = Ci.nsMsgSearchAttrib.MsgStatus;
      value = term.value;
      value.attrib = term.attrib;
      value.status = Ci.nsMsgMessageFlags.Replied;
      term.value = value;
      //which way to define the button:
      //     term.op = aFilterValue ? Ci.nsMsgSearchOp.Is : Ci.nsMsgSearchOp.Isnt;
      term.op = aFilterValue ? Ci.nsMsgSearchOp.Isnt : Ci.nsMsgSearchOp.Is;
      term.booleanAnd = true;
      aTerms.push(term);
    },
  });


  wind.QuickFilterBarMuxer._bindUI();



  //console.log("defineFilterNotReplied");
};


var ExpressionSearchTools = class extends ExtensionCommon.ExtensionAPI {





  onStartup() {
    //   console.log("Expression Search Tools startup...");




    //let { extension } = this;
    //already done in ExpressionSearch experiment 
    //     registerResourceUrl(extension, "expressionsearch");

  }

  onShutdown(isAppShutdown) {
    //debugger;
    //    console.log("removing ExpressionSearchTools");
    if (isAppShutdown) {
      return; // the application gets unloaded anyway
    };
    QuickFilterManager.killFilter("expression-search-unreplied");
    if (repButton != null) repButton.remove();

    Services.obs.notifyObservers(null, "startupcache-invalidate", null);
    Services.obs.notifyObservers(null, "chrome-flush-caches", null);
    //    console.log("Expression Search Tools/ Google Mail UI shutdown");
  }

  getAPI(context) {
    return {
      ExpressionSearchTools: {


        setXNote: async function (id, note) {
          if (typeof (xnote) == "undefined") var { xnote } = await ChromeUtils.import("resource://expressionsearch/modules/xnotestore.jsm");
          xnote.notes[id] = note;
   //       console.log("xn", id, xnote.notes[id]);
        },

        deleteXNote: async function (id) {
          if (typeof (xnote) == "undefined")  var { xnote } = await ChromeUtils.import("resource://expressionsearch/modules/xnotestore.jsm");
          delete xnote.notes[id];
      //    xnote.notes.splice(id, 1);// = xnote.notes.filter(item => item !== id.toString());
        },


        initWindow: async function (windowId) {
          let domWindow = context.extension.windowManager.get(windowId).window;
//          console.log("windType", domWindow, domWindow.type);
let type = domWindow.document.documentElement.getAttribute('windowtype');
if (!["mail:3pane", "mailnews:virtualFolderList"].includes(type)) {
  return;
}

          init_qfbNotRepliedButton(domWindow);
          defineFilterNotReplied(domWindow);
          // console.log("expsearchtools init done");
        },


      },
    };
  }
};
