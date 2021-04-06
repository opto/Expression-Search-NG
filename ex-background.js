//Added for TB 78+ (c) by Klaus Buecher/opto 2020-2021
//License: MPL 2
messenger.BootstrapLoader.registerChromeUrl([ 
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





let url = messenger.runtime.getURL("content/help_bckg.html");
//await browser.tabs.create({ url });
messenger.windows.create({ url, type: "popup", width: 910, height: 750, });


messenger.BootstrapLoader.registerDefaultPrefs("content/defaults.js");

 messenger.BootstrapLoader.registerBootstrapScript("bootstrap.js");