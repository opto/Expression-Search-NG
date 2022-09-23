/*
 *
 * Code for TB 78 or later: Creative Commons (CC BY-ND 4.0):
 *      Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0)
 *
 * Copyright: Klaus Buecher/opto 2021
 * Contributors:  see Changes.txt
 */

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
      }
      return;
  }
});

messenger.runtime.onInstalled.addListener(async ({ reason, temporary }) => {
  if (temporary) {
    // skip during development
    //   return;
  }

  switch (reason) {
    case "install":
      {
        const url = messenger.runtime.getURL("html/installed.html");
        await messenger.tabs.create({ url });
      }
      break;

    case "update":
      {
        const url = messenger.runtime.getURL("html/update.html");
        await messenger.tabs.create({ url });
      }
      break;
  }
});

async function main() {
  messenger.ExpressionSearch.initPrefs();

  const windows = await messenger.windows.getAll();
  for (let window of windows) {
    // initWindow() knows if the window needs init.
    await messenger.ExpressionSearch.initWindow(window.id);
  }
  messenger.windows.onCreated.addListener((window) => {
    // initWindow() knows if the window needs init.
    messenger.ExpressionSearch.initWindow(window.id);
  });
}

main();
