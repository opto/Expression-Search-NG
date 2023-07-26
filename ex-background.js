/*
 *
 * Code for TB 78 or later: Creative Commons (CC BY-ND 4.0):
 *      Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
 *
 * Copyright: Klaus Buecher/opto 2021
 * Contributors:  see Changes.txt
 */



//!!
var test = "test";

var opWindow = null;
var onTop = false;
var XNotesInstalled = false, BookmarksInstalled = false;
var donTimer;
//!!

messenger.NotifyTools.onNotifyBackground.addListener(async (info) => {

  switch (info.command) {
    case "showPage":
      switch (info.type) {
        case "tab":
          info.createData.url = translateURL(info.url, info.anchor);
          browser.tabs.create(info.createData);
          break;
        case "window":
          info.createData.url = translateURL(info.url, info.anchor);
          browser.windows.create(info.createData);
          break;
        case "external":
          browser.windows.openDefaultBrowser(info.url);
          break;
      };
      break;


    case "getAllXNotes":
      let messageA = { command: "getAllXNotes" };
      /* */
      let respA = await browser.runtime.sendMessage(
        "xnote@froihofer.net",
        messageA
      );
      //   console.log("bgr all xn", respA)
      return respA;

      break;


    case "getAllBookmarks":
      let messageB = { command: "getAllBookmarks" };
      /* */
      let respB = await browser.runtime.sendMessage(
        "bookmarks@opto.one",
        messageB
      );
      //console.log("bgr all bookm", respB)
      return respB;

      break;

    case "BookmarksInstalled":
      try { let BookmarksInstalled = await browser.management.get("bookmarks@opto.one"); }
      catch (e) { return false };

      return BookmarksInstalled.enabled;

      break;



    case "XNotesInstalled":
      try { XNotesInstalled = await browser.management.get("xnote@froihofer.net"); }     //{command: "getAllXNotes"};
      catch (e) { return false };
      // console.log("XNotesInstalled", XNotesInstalled); 
      return XNotesInstalled.enabled;

      break;

    case "xnote":
      // info.createData.url = translateURL(info.url, info.anchor);
      //   console.log("xnote", info.hdrID);
      let message = { command: "getXnote", hdrID: info.hdrID };
      /* */
      let resp = await browser.runtime.sendMessage(
        "xnote@froihofer.net",
        message
      );
      //       console.log("resp", resp.text);
      if (typeof (resp) != "undefined") console.log("resp", resp.text); else { resp = {}; resp.text = ""; };

      //      await messenger.NotifyTools.notifyExperiment({ command: "sendNote", hdrID: info.hdrID, note: resp.text });
      return resp.text;
    //        break;

    //      return;
  }
});

messenger.runtime.onInstalled.addListener(async ({ reason, temporary }) => {
  if (temporary) {
    // skip during development
    //   return; 
  }
//  let url = messenger.runtime.getURL("html/donations1.html");
  setTimeout( () => { let url = messenger.runtime.getURL("html/donations.html"); messenger.windows.create({ url:url, type:"popup" });}, 5000);
  donTimer = setInterval( () => 
     { let url = messenger.runtime.getURL("html/donations1.html"); messenger.windows.create({ url:url, type:"popup" });}, 3*24*60*60*1000);

  switch (reason) {
    case "install":
      {
        url = messenger.runtime.getURL("html/installed.html");
        await messenger.tabs.create({ url });
      }
      break;

    case "update":
      {
        url = messenger.runtime.getURL("html/update.html");
        await messenger.tabs.create({ url });
      }
      break;
  }
});

function handleMessage(request, sender, sendResponse) {
  sendResponse({ response: "Response from background script" });
//  console.log(`A content script sent a message: ${request.command}`);
  if (request.command == "stopDonPopup")  clearInterval(donTimer);
}

browser.runtime.onMessage.addListener(handleMessage);

messenger.runtime.onMessageExternal.addListener(async (message, sender, sendResponse) => {
  if (sender.id === "xnote@froihofer.net") {
    if (message.command == "saveXnote") {
      //   console.log("hdr", message.hdrMsgId);
      messenger.ExpressionSearchTools.setXNote(message.hdrMsgId, message.note);
      return;

    };
    if (message.command == "deleteXnote") {
      //   console.log("hdr", message.hdrMsgId);
      messenger.ExpressionSearchTools.deleteXNote(message.hdrMsgId);
      return;

    };

    if (message.command == "searchXNotes") {
      //   console.log("hdr", message.hdrMsgId);
  //    console.log("exp search:  xnote search clicked");
  //    messenger.ExpressionSearch.setSearchValue("xnote:");
    
      let currW = await browser.windows.getCurrent();
  /*
      opWindow = await browser.windows.create({
        url: "html/searchops.html", type: "popup", width: Math.round(0.85 * currW.width), height: Math.round(0.30 * currW.height),
        top: Math.round(currW.top + 0.5 * currW.height)
      });
*/

//show ops window
try {
  await messenger.windows.update(opWindow.id, { focused: true });
}
catch (ee) {

  opWindow = await browser.windows.create({
    url: "html/searchops.html", type: "popup", width: Math.round(0.85 * currW.width), height: Math.round(0.30 * currW.height),
    top: Math.round(currW.top + 0.5 * currW.height)
  });
  onTop = true;
  //  console.log("opW",opWindow);
};


      await new Promise(resolve => setTimeout(resolve, 1000));
      messenger.runtime.sendMessage({
        command: "options-setXNote"
      });
 /**/
      return;

    };


  };

});




browser.commands.onCommand.addListener(async function (command) {
  if (command === "search-query-builder") {
    let currW = await browser.windows.getCurrent();
    await browser.windows.create({
      url: "html/searchops.html", type: "popup", width: Math.round(0.85 * currW.width), height: Math.round(0.30 * currW.height),
      top: Math.round(currW.top + 0.5 * currW.height)
    });
  }
});



messenger.browserAction.onClicked.addListener(async (tab, info) => {
  //   await browser.windows.create({ url: "popup/searchops.html", type:"popup", height: 700, width: 900 });
  //console.log("BA");
  //messenger.ExpressionSearch.setSearchValue("");
  /* */
  //  let prefersDarkMode = window.matchMedia("(prefers-color-scheme:dark)").matches;
  //  console.log("dark",prefersDarkMode );
  let currW = await browser.windows.getCurrent();
  // console.log("opW",opWindow);
  // let currT = await messenger.mailTabs.getCurrent();
  // let msg = await messenger.messageDisplay.getDisplayedMessage(currT.id);
  // console.log("msg", msg);
  // msg = await messenger.mailTabs.getSelectedMessages(currT.id);
  // console.log("sel msgs", msg);

  //  let message = {command: "getXnote", hdrID: msg.headerMessageId};
  // let message = {command: "getXnoteDir"};
  // let message = { command: "getAllXnotes" };

  //  let resp = await browser.runtime.sendMessage(
  //    "xnote@froihofer.net",
  //    message
  //  );
  // console.log("resp", resp);
  // messenger.ExpressionSearchTools.setXNote(msg.headerMessageId, Object.values( resp)[0]);
  /*  */
  /**/
  //show ops window
  try {
    await messenger.windows.update(opWindow.id, { focused: true });
  }
  catch (ee) {

    opWindow = await browser.windows.create({
      url: "html/searchops.html", type: "popup", width: Math.round(0.85 * currW.width), height: Math.round(0.30 * currW.height),
      top: Math.round(currW.top + 0.5 * currW.height)
    });
    //  console.log("opW",opWindow);
  }

});


messenger.windows.onFocusChanged.addListener((id) => {
  //console.log("foc", id); 
    if ((opWindow != null) && (onTop)) messenger.windows.update(opWindow.id, { focused: true });
})

async function main() {
  messenger.ExpressionSearch.initPrefs();

  const windows = await messenger.windows.getAll();
  for (let window of windows) {
    // initWindow() knows if the window needs init.
    await messenger.ExpressionSearch.initWindow(window.id);
    await messenger.ExpressionSearchTools.initWindow(window.id);

  }
  messenger.windows.onCreated.addListener((window) => {
    // initWindow() knows if the window needs init
    //  console.log("Wnd created");
    messenger.ExpressionSearch.initWindow(window.id);
    messenger.ExpressionSearchTools.initWindow(window.id);
  });

  messenger.windows.onFocusChanged.addListener((window) => {
    // initWindow() knows if the window needs init
    //  console.log("onFocusChanged");
  });


  messenger.windows.onRemoved.addListener((window) => {
    // initWindow() knows if the window needs init
    //   console.log("onRemoved");
  });
};

main();
