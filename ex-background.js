//Added for TB 78+ (c) by Klaus Buecher/opto 2020-2021
//License: MPL 2



var url = messenger.runtime.getURL("content/help_bckg.html");
//await browser.tabs.create({ url });
//messenger.windows.create({ url, type: "popup", width: 910, height: 750, });

messenger.BootstrapLoader.onNotifyBackground.addListener(async (info) => {
   switch (info.command) {
     case "showHelp":
       //do something
       console.log("showHelp");
       messenger.windows.create({ url, type: "popup", width: 910, height: 750, });

       //let rv = await doSomething();
       return;// rv;
       break;
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
       const url = messenger.runtime.getURL("popup/installed.html");
       await messenger.windows.create({ url, type: "popup", height: 750, width: 1090, });
//         await messenger.windows.create({ url, type: "popup", width: 910, height: 750, });
      }
     break;
     
     case "update":
     {
       const url = messenger.runtime.getURL("popup/update.html");
       // const url = messenger.runtime.getURL("popup/installed.html");
//       await messenger.windows.create({ url, type: "popup", width: 910, height: 750, });
         await messenger.windows.create({ url, type: "popup", height: 750, width: 1090, });
     }
     break;
   }
 });
 
 







 async function main () {

 await  messenger.BootstrapLoader.registerChromeUrl([ 
      ["content", "expressionsearch",           "content/"],
      ["locale",  "expressionsearch", "en-US",  "locale/en-US/"],
   //   ["locale",  "quicktext", "ca",     "chrome/locale/ca/"],
      ["locale",  "expressionsearch", "de",     "locale/de/"],
      /*,
      ["locale",  "quicktext", "es-MX",  "chrome/locale/es-MX/"],
      ["locale",  "quicktext", "es",     "chrome/locale/es/"],
      ["locale",  "quicktext", "fr",     "chrome/locale/fr/"],
   */
      ["resource",  "expressionsearch",  ""]
  
  ]);
   //debugger;

   await   messenger.BootstrapLoader.registerDefaultPrefs("content/defaults.js");
   //debugger;
   await messenger.BootstrapLoader.registerOptionsPage("chrome://expressionsearch/content/esPrefDialog.xhtml");
   await     messenger.BootstrapLoader.registerBootstrapScript("bootstrap.js");
   
 };


 main();