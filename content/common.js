// Common functions
// MPL/GPL
// Opera.Wang 2011/03/21
//Changes for TB 78+ (c) by Klaus Buecher/opto 2020-2021

"use strict";
var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
var { MailUtils } = ChromeUtils.import("resource:///modules/MailUtils.jsm");
const ADDON_ID = "expressionsearch@opto.one";
var EXPORTED_SYMBOLS = ["ExpressionSearchCommon"];


var ExpressionSearchCommon = {
  strings: Services.strings.createBundle('chrome://expressionsearch/locale/ExpressionSearch.properties'),
  translateURL: function(url,anchor) {
    if ( typeof(anchor) == 'undefined' ) anchor = '';
    if ( url.indexOf(':') != -1 )
      return url+anchor;
    try {
      return ExpressionSearchCommon.strings.GetStringFromName(url)+anchor;
    } catch (e) {
      return url+anchor;
    }
  },
  loadURL: function(url, name = null, additional = '') { // not support html anchor
    let newURL = ExpressionSearchCommon.translateURL(url);
    if (name == null) name = "";
    const kFeatures = "chrome,centerscreen,modal,titlebar";
    //let params = "chrome=no,menubar=no,status=no,location=no,resizable,scrollbars,centerscreen" + additional;
    let win = Services.ww.openWindow(null, newURL, name, kFeatures, null);
  },
  showModalDialog: function(win, url) {
      // open is more standard compare with openDialog
      win.open(url, "_blank", "chrome,dialog,modal");
  },
  getTabObject: function() {
    let tabmail;
    // Try opening new tabs in an existing 3pane window
    let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
    if (mail3PaneWindow) {
      tabmail = mail3PaneWindow.document.getElementById("tabmail");
      mail3PaneWindow.focus();
    }
    return tabmail;
  },
  loadTab: function(url,anchor) {
    let args = { type: 'contentTab' };
    let tabmail = ExpressionSearchCommon.getTabObject();
    if ( typeof(url) == 'object' ) {
        args = url;
    } else {
        args.contentPage = ExpressionSearchCommon.translateURL(url,anchor);
    }
    if (tabmail)
      tabmail.openTab( args.type, args );
    else
      this.loadURL(args.contentPage || args.folder);
  },
  loadUseProtocol: function(url) {
    Components.classes["@mozilla.org/uriloader/external-protocol-service;1"].getService(Components.interfaces.nsIExternalProtocolService).loadURI(Services.io.newURI(url, null, null), null);
  },
  openLinkExternally: function(url) {
    let uri = url;
    if (!(uri instanceof Ci.nsIURI)) {
      uri = Services.io.newURI(url);
    }
    
    Cc["@mozilla.org/uriloader/external-protocol-service;1"]
      .getService(Ci.nsIExternalProtocolService)
      .loadURI(uri);
  },
loadDonate: function(pay) {
    let url = "";//"https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=893LVBYFXCUP4&lc=US&item_name=Expression%20Search&no_note=0&currency_code=USD&bn=PP%2dDonationsBF%3abtn_donate_LG%2egif%3aNonHostedGuest";
    if ( typeof(pay) != 'undefined' ) {
      if ( pay == 'alipay' ) url = "https://www.paypal.com/donate?hosted_button_id=EMVA9S5N54UEW";  //return this.loadTab( {type: 'contentTab', contentPage: "chrome://expressionsearch/content/qr-alipay.png"});
      if ( pay == 'paypal' ) url = "https://www.paypal.com/donate?hosted_button_id=EMVA9S5N54UEW";
      if ( pay == 'mozilla' ) url = "https://www.paypal.com/donate?hosted_button_id=EMVA9S5N54UEW";//"https://addons.thunderbird.net/thunderbird/addon/expressionsearch-NG"; // addon home page
    }
    ExpressionSearchCommon.openLinkExternally(url);
  },
  sendEmailWithTB: function(url) {
      MailServices.compose.OpenComposeWindowWithURI(null, Services.io.newURI(url, null, null));
  },
  getFolder: function(url) {
    let msgFolder;
    try {
      msgFolder = MailUtils.getExistingFolder(url);
    } catch(err) {
      try {
        msgFolder = MailUtils.getFolderForURI(url);
      } catch(err) {}
    }
    return msgFolder;
  },
}
