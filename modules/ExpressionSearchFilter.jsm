// Opera Wang, 2011/3/24
//  MPL2.0
// Expression Search Filter
// MessageTextFilter didn't want me to extend it much, so I have to define mine.
//Changes for TB 78/91/102+ (c) by Klaus Buecher/opto 2020-2022
"use strict";


//!!
var { ExtensionParent } = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");
var extension = ExtensionParent.GlobalManager.getExtension("expressionsearch@opto.one");



var EXPORTED_SYMBOLS = ["ExpressionSearchFilter"];
var { ExtensionParent } = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");

//var xnote;
//if (typeof (xnote) == "undefined")  { xnote } = ChromeUtils.import("resource://expressionsearch/modules/xnotestore.jsm");
if (typeof (xnote) == "undefined") var { xnote } = ChromeUtils.import("resource://expressionsearch/modules/xnotestore.jsm");

//console.log("xn", xnote.test);


var { ExpressionSearchChrome } = ChromeUtils.import("resource://expressionsearch/modules/ExpressionSearchChrome.jsm");
var { ExpressionSearchLog } = ChromeUtils.import("resource://expressionsearch/modules/ExpressionSearchLog.jsm");
var { ExpressionSearchCommon } = ChromeUtils.import("resource://expressionsearch/modules/ExpressionSearchCommon.jsm");
var {
  MessageTextFilter,
  QuickFilterManager,
  QuickFilterSearchListener,
  QuickFilterState,
} = ChromeUtils.import("resource:///modules/QuickFilterManager.jsm");
var {
  ExpressionSearchComputeExpression,
  ExpressionSearchExprToStringInfix,
  ExpressionSearchTokens,
} = ChromeUtils.import("resource://expressionsearch/modules/gmailuiParse.jsm");

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
var { GlodaUtils } = ChromeUtils.import("resource:///modules/gloda/GlodaUtils.jsm");// for GlodaUtils.deMime and parseMailAddresses

// XXX we need to know whether the gloda indexer is enabled for upsell reasons,
// but this should really just be exposed on the main Gloda public interface.
var { GlodaIndexer } = ChromeUtils.import(
  "resource:///modules/gloda/GlodaIndexer.jsm"
);

// for check attachment name, https://developer.mozilla.org/en/Extensions/Thunderbird/HowTos/Common_Thunderbird_Use_Cases/View_Message
var { MimeMessage } = ChromeUtils.import(
  "resource:///modules/gloda/MimeMessage.jsm"
);

var { AppConstants } = ChromeUtils.import("resource://gre/modules/AppConstants.jsm");
var { MimeParser } = ChromeUtils.import("resource:///modules/mimeParser.jsm");
var { NetUtil } = ChromeUtils.import("resource://gre/modules/NetUtil.jsm"); // for readInputStreamToString
var { jsmime } = ChromeUtils.import("resource:///modules/jsmime.jsm"); // JSMIME

let platformIsMac = AppConstants.platform == "macosx" ? true : false;

// These two need some thinking, are they global? Why is badREs cleared for virtual folder creation?
let haveBodyMapping = {}; // folderURI+messageKey => true (haveBody)
let badREs = {};

class UtilsBase {
  constructor() {
    this.extension = ExtensionParent.GlobalManager.getExtension("expressionsearch@opto.one");
  }

  // https://bugzilla.mozilla.org/show_bug.cgi?id=818634 Remove support for Date.prototype.toLocaleFormat
  // toLocaleTimeString depend on user settings
  msgToLocaleFormat(aMsgHdr, format) {
    // dateInSeconds*1M
    return (new Date(aMsgHdr.date / 1000))
      .toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) // "12/30/2012, 11:00:00"
      .replace(/(\d+)\/(\d+)\/(\d+),\s(.*)/, format);
  }

  getRegEx(aSearchValue) {
    /*
     * If there are no flags added, you can add a regex expression without
     * / delimiters. If we detect a / though, we will look for flags and
     * add them to the regex search.
     */
    let searchValue = aSearchValue, regexp = /^__WONTMATCH__$/;
    let searchFlags = "";
    if (aSearchValue.charAt(0) == "/") {
      let lastSlashIndex = aSearchValue.lastIndexOf("/");
      if (lastSlashIndex == 0) lastSlashIndex = aSearchValue.length;
      searchValue = aSearchValue.substring(1, lastSlashIndex);
      searchFlags = aSearchValue.substring(lastSlashIndex + 1);
    }
    try {
      regexp = new RegExp(searchValue, searchFlags);
    } catch (err) {
      if (!badREs[aSearchValue]) {
        badREs[aSearchValue] = true;
        ExpressionSearchLog.log("Expression Search Caught Exception " + err.name + ":" + err.message + " with regex '" + aSearchValue + "'", 1);
      }
    }
    return regexp;
  }
}

// On reload, the terms cannot be updated and therefore may not point to extension code (the used instance is no
// longer there after unloading). So customTerms have to include all the code they need.
class CustomerTermBase extends UtilsBase {
  constructor(nameId, Operators) {
    //    console.log("ops", Operators);

    //debugger;
    super();

    let self = this; // In constructors, this is always your instance. Just for safe.
    self.Operators = Operators;

    self.id = "expressionsearch#" + nameId;
    self.name = this.extension.localeData.localizeMessage(nameId);
    self.needsBody = false;
  //  console.log("getops-self", self.Operators, self.id);
    self._isValid = function _isValid(aSearchScope) {
      //this needs some rework for regEx
    //       return true;
      if (aSearchScope == Ci.nsMsgSearchScope.LDAP || aSearchScope == Ci.nsMsgSearchScope.LDAPAnd || aSearchScope == Ci.nsMsgSearchScope.LocalAB || aSearchScope == Ci.nsMsgSearchScope.LocalABAnd) return false;
      if (!self.needsBody) return true;
      if (aSearchScope == Ci.nsMsgSearchScope.offlineMail || aSearchScope == Ci.nsMsgSearchScope.offlineMailFilter
        || aSearchScope == Ci.nsMsgSearchScope.localNewsBody || aSearchScope == Ci.nsMsgSearchScope.localNewsJunkBody) return true;
      return false;
      //onlineManual 
    };
    self.getEnabled = function _getEnabled(scope, op) {
            return true;
   //   console.log("enabled", scope, self._isValid(scope), self.id, op, Operators);
      return self._isValid(scope);// && Operators.includes(op);
    };
    // called by SearchSpec.jsm to check if available for offlineScope and serverScope
    // or in address book search
    self.getAvailable = function _getAvailable(scope, op) {
           return true;
  //    console.log("available", scope, self._isValid(scope), self.id, op, Operators);
      return self._isValid(scope);// && Operators.includes(op);
    };
    /*
        self.getAvailableOperators = function _getAvailableOperators(scope,length ) {  //length
          debugger;
//                console.log("getops", Operators);
     //     let length = {};
    
          if (!self._isValid(scope)) {
      //      length.value = 0;
//      console.log("noscope");
            return [];
          }
    
      //    length.value = Operators.length;
          return Operators;
        };
        */
    self.getAvailableOperators = function _getAvailableOperators(scope) {  //length
      //      debugger;
//      console.log("getops", self.Operators, self.id);
      //     let length = {};
      /**/

      return Operators;//[Ci.Contains, Ci.nsMsgSearchOp.DoesntContain];//Operators;

    };
  }

}

// https://bugzilla.mozilla.org/show_bug.cgi?id=959309 - Finish JSMime 0.2 and land it on comm-central 
// https://bugzilla.mozilla.org/show_bug.cgi?id=858337 - Implement header parsing in JSMime 
// https://bugzilla.mozilla.org/show_bug.cgi?id=790855 - Make the new MIME parser charset-aware 
class Emitter extends UtilsBase {
  constructor(msgData, aSearchValue, nameId) {
    super();

    let searchValue, regexp;
    let attachmentSearch = (nameId == "attachmentNameOrType");
    if (attachmentSearch) searchValue = aSearchValue.toLowerCase();
    else regexp = this.getRegEx(aSearchValue);
    let rfc822Parts = {}, contentDict = {}, bodyParts = {};
    let me = this;
    me.found = false;
    me.haveAttachment = false;

    // http://en.wikipedia.org/wiki/MIME
    // mailnews/mime/src/mimemoz2.cpp && mailnews/mime/src/mimemsg.cpp
    // if not rfc822 default name is 1040 in mime.properties: 1040=Part %s
    // !external urlString.Append(".eml");
    // use munged_subject.eml when have subject && charset(https://bugzilla.mozilla.org/show_bug.cgi?id=674488), or "ForwardedMessage.eml", I just simulate this rule
    me.startPart = function (partNum, headers) {
      try {
        let contentType = headers.get('content-type');
        contentDict[partNum] = contentType; // body need content type
        if (!attachmentSearch) return;
        if (contentType) {
          if ('type' in contentType) {
            let type = contentType.type; // already lower-case
            if (type.indexOf(searchValue) != -1) me.found = true;
            if (type == 'message/rfc822') rfc822Parts[partNum + '$'] = 1;
          }
          if (contentType.has('name')) {
            let name = contentType.get('name');
            ExpressionSearchLog.info("attach name:" + name);
            if (name.toLowerCase().indexOf(searchValue) != -1) me.found = true;
            me.haveAttachment = true;
          }
        }
        if (me.found && me.haveAttachment) return;
        for (let disposition of (headers.get('content-disposition') || [])) {
          // check header filename
          let dispositionObject = MimeParser.parseHeaderField(disposition, MimeParser.HEADER_PARAMETER | MimeParser.HEADER_OPTION_ALL_I18N, '');
          if ('preSemi' in dispositionObject && dispositionObject.preSemi == 'attachment') me.haveAttachment = true;
          if (dispositionObject.has('filename')) {
            let filename = dispositionObject.get('filename');
            ExpressionSearchLog.info("attach filename:" + filename);
            if (filename.toLowerCase().indexOf(searchValue) != -1) me.found = true;
            me.haveAttachment = true;
          }
        }
        if (!(me.found && me.haveAttachment) && partNum in rfc822Parts) {
          me.haveAttachment = true;
          let fakeName;
          if (headers.has('subject') /* charset? */) { // subject is Unstructured
            let subject = headers.get('subject');
            fakeName = MailServices.mimeConverter.decodeMimeHeader(subject, null, false, false).toLowerCase();
          }
          if (typeof (fakeName) == 'undefined') fakeName = "ForwardedMessage.eml";
          if (!fakeName.endsWith('.eml')) fakeName += ".eml";
          ExpressionSearchLog.info("fake:" + fakeName + " match " + searchValue);
          if (fakeName.toLowerCase().indexOf(searchValue) != -1) me.found = true;
        }
      } catch (err) { ExpressionSearchLog.logException(err); }
    }; // startPart

    me.deliverPartData = function (partNum, data) { // won't get called when bodyformat: 'none'
      try {
        if (me.found) return;
        let contentType = contentDict[partNum];
        if (contentType && contentType.mediatype == 'text') bodyParts[partNum] = !(partNum in bodyParts) ? data : bodyParts[partNum] + data;
      } catch (err) { ExpressionSearchLog.logException(err); }
    }; // deliverPartData
    me.endPart = function (partNum) {
      try {
        if (me.found || attachmentSearch) return;
        let contentType = contentDict[partNum], body = bodyParts[partNum];
        if ((partNum in bodyParts) && contentType && contentType.mediatype == 'text') {
          if (contentType.subtype != 'plain') {
            // test against html && strip && test again
            me.found = regexp.test(body);
            if (!me.found) {
              let parserUtils = Cc["@mozilla.org/parserutils;1"].getService(Ci.nsIParserUtils);
              let plainText = parserUtils.convertToPlainText(body,
                Ci.nsIDocumentEncoder.OutputLFLineBreak | Ci.nsIDocumentEncoder.OutputNoScriptContent | Ci.nsIDocumentEncoder.OutputNoFramesContent | Ci.nsIDocumentEncoder.OutputBodyOnly, 0);
              me.found = regexp.test(plainText);
            }
          } else me.found = regexp.test(body);
        }
      } catch (err) { ExpressionSearchLog.logException(err); }
    }; // endPart

    let options;
    if (attachmentSearch) options = { bodyformat: 'none' };
    else options = { bodyformat: 'decode', strformat: 'unicode' }; // JSMIME 0.1 will ignore strformat
    MimeParser.parseSync(msgData, me, options);
  }
}

class BodyTermBase extends CustomerTermBase {
  constructor(nameId, Operators, resultFunc) {
    super(nameId, Operators);

    this.needsBody = true;
    this.match = function (aMsgHdr, aSearchValue, aSearchOp) {
      let folder = aMsgHdr.folder;
      try {
        if (folder.getMsgInputStream && ((aMsgHdr.flags & Ci.nsMsgMessageFlags.Offline) || folder instanceof Ci.nsIMsgLocalMailFolder)) {
          let reusable = {}, data, stream = folder.getMsgInputStream(aMsgHdr, reusable);
          try {
            data = NetUtil.readInputStreamToString(stream, aMsgHdr.messageSize);
          } catch (err) { ExpressionSearchLog.logException(err); }
          if (!reusable.value) stream.close(); // close if not reusable
          if (typeof (data) != 'undefined') {
            let emitterInstance = new Emitter(data, aSearchValue, nameId);
            haveBodyMapping[folder.URI + " | " + aMsgHdr.messageKey] = true;
            return resultFunc.call(null, emitterInstance, aSearchOp);
          }
        }
      } catch (err) { ExpressionSearchLog.logException(err); }
      return haveBodyMapping[folder.URI + " | " + aMsgHdr.messageKey] = false;
    }
  }
}

// File scope code is being executed the first time the JSM is loaded. This adds our custom terms.
(
  function AddExpressionSearchCustomerTerms() {
    // search subject with regular expression, reference FiltaQuilla by Kent James
    // case sensitive
    //bad workaround: the global GlodaUtils is only visible after a delay, as created by a debugger statement.
    var { GlodaUtils } = ChromeUtils.import("resource:///modules/gloda/GlodaUtils.jsm");// for GlodaUtils.deMime and parseMailAddresses
    let subjectRegex = new CustomerTermBase("subjectRegex", [Ci.nsMsgSearchOp.Matches, Ci.nsMsgSearchOp.DoesntMatch]);
    subjectRegex.match = function (aMsgHdr, aSearchValue, aSearchOp) {
      // aMsgHdr.subject is mime encoded, also aMsgHdr.subject may has line breaks in it
      // Upon putting subject into msg db, all Re:'s are stripped and MSG_FLAG_HAS_RE flag is set. 
      let subject = aMsgHdr.mime2DecodedSubject || '';
      if (aMsgHdr.flags & Ci.nsMsgMessageFlags.HasRe) subject = "Re: " + subject; // mailnews.localizedRe ?
      return this.getRegEx(aSearchValue).test(subject) ^ (aSearchOp == Ci.nsMsgSearchOp.DoesntMatch);
    };

    // workaround for Bug 124641 - Thunderbird does not handle multi-line headers correctly when search term spans lines
    // case sensitive, not like normal subject search
    // Now the bug was fixed after TB5.0, but still usefull when subject contains special characters
    let subjectSimple = new CustomerTermBase("subjectSimple", [Ci.nsMsgSearchOp.Contains, Ci.nsMsgSearchOp.DoesntContain]);
    subjectSimple.match = function (aMsgHdr, aSearchValue, aSearchOp) {
      //console.log("simple");
      return (aMsgHdr.mime2DecodedSubject.indexOf(aSearchValue) != -1) ^ (aSearchOp == Ci.nsMsgSearchOp.DoesntContain);
    };

    let headerRegex = new CustomerTermBase("headerRegex", [Ci.nsMsgSearchOp.Matches, Ci.nsMsgSearchOp.DoesntMatch]);
    headerRegex.match = function (aMsgHdr, aSearchValue, aSearchOp) {
      // https://bugzilla.mozilla.org/show_bug.cgi?id=363238
      // https://developer.mozilla.org/en-US/docs/Extensions/Thunderbird/customDBHeaders_Preference
      // https://github.com/protz/thunderbird-stdlib/blob/master/msgHdrUtils.js msgHdrGetHeaders
      // the header and its regex are separated by a '~' or '=' in aSearchValue
      // 'List-Id=/all-test/i' will match all messages that have List-ID header, and it's content match /all-test/i
      // 'List-ID' will match all messages that have this header.
      // flags, label, statusOfset, sender, recipients, ccList, subject, message-id, references, date, dateReceived
      // priority, msgCharSet, size, numLines, offlineMsgSize, threadParent, msgThreadId, ProtoThreadFlags, gloda-id, sender_name, gloda-dirty, recipient_names

      // let e = aMsgHdr.propertyEnumerator; let str = "property:\n";
      // while ( e.hasMore() ) { let k = e.getNext(); str += k + ":" + aMsgHdr.getStringProperty(k) + "\n"; }
      // ExpressionSearchLog.log(str);
      // ExpressionSearchLog.logObject(aMsgHdr,'aMsgHdr',0);
      // flags:1 label:0 statusOfset:21 sender:<cc@some.com> recipients:swe-web@some.com subject:[swe-web] Error: Web Applications Down message-id:201202030701.q1371Noo014742@peopf999.some.com date:4f2b8643 dateReceived:4f2b864b priority:1 list-id:<swe-web.some.com> x-mime-autoconverted:from quoted-printable to 8bit by sympa.some.com id q1371O8j002081 msgCharSet:iso-8859-1 msgOffset:1f6e size:4728 numLines:180 storeToken:8046 threadParent:ffffffff msgThreadId:1f6e ProtoThreadFlags:0 sender_name:2453|swe-web@some.COM
      // Can't add content-type/receieved etc to customDBHeaders which thunderbird already parsed and removed from header

      let headerName = aSearchValue.toLowerCase();
      let splitIndex = aSearchValue.indexOf('~');
      if (splitIndex == -1) splitIndex = aSearchValue.indexOf('=');
      if (splitIndex == -1) {
        let headerValue = aMsgHdr.getStringProperty(headerName);
        return ((headerValue != '') ^ (aSearchOp == Ci.nsMsgSearchOp.DoesntMatch));
      }
      headerName = aSearchValue.slice(0, splitIndex);
      let regex = aSearchValue.slice(splitIndex + 1);
      let headerValue = aMsgHdr.getStringProperty(headerName);
      return this.getRegEx(regex).test(headerValue) ^ (aSearchOp == Ci.nsMsgSearchOp.DoesntMatch);
    };

    let dayTime = new CustomerTermBase("dayTime", [Ci.nsMsgSearchOp.IsBefore, Ci.nsMsgSearchOp.IsAfter]);
    dayTime.match = function (aMsgHdr, aSearchValue, aSearchOp) {
      return (this.msgToLocaleFormat(aMsgHdr, '$4') > aSearchValue) ^ (aSearchOp == Ci.nsMsgSearchOp.IsBefore);
    };

    let dateMatch = new CustomerTermBase("dateMatch", [Ci.nsMsgSearchOp.Contains, Ci.nsMsgSearchOp.DoesntContain]);
    dateMatch.match = function (aMsgHdr, aSearchValue, aSearchOp) {
      let msgTimeUser = (new Date(aMsgHdr.date / 1000)).toLocaleString();
      let msgTimeStandard = this.msgToLocaleFormat(aMsgHdr, '$3/$1/$2 $4');
      return (msgTimeUser.indexOf(aSearchValue) != -1 || msgTimeStandard.indexOf(aSearchValue) != -1) ^ (aSearchOp == Ci.nsMsgSearchOp.DoesntContain);
    };

    let bccSearch = new CustomerTermBase("Bcc", [Ci.nsMsgSearchOp.Contains, Ci.nsMsgSearchOp.DoesntContain]);
    bccSearch.match = function (aMsgHdr, aSearchValue, aSearchOp) {
      return (GlodaUtils.deMime(aMsgHdr.bccList).toLowerCase().indexOf(aSearchValue.toLowerCase()) != -1) ^ (aSearchOp == Ci.nsMsgSearchOp.DoesntContain);
    };

    let fromRegex = new CustomerTermBase("fromRegex", [Ci.nsMsgSearchOp.Matches, Ci.nsMsgSearchOp.DoesntMatch]);
    fromRegex.match = function (aMsgHdr, aSearchValue, aSearchOp) {
      return this.getRegEx(aSearchValue).test(aMsgHdr.mime2DecodedAuthor) ^ (aSearchOp == Ci.nsMsgSearchOp.DoesntMatch);
    };

    let toRegex = new CustomerTermBase("toRegex", [Ci.nsMsgSearchOp.Matches, Ci.nsMsgSearchOp.DoesntMatch]);
    toRegex.match = function (aMsgHdr, aSearchValue, aSearchOp) {
      // https://bugzilla.mozilla.org/show_bug.cgi?id=522886
      // parseMailAddresses will do mimeDecode
      let to = aMsgHdr.mime2DecodedTo ? aMsgHdr.mime2DecodedRecipients : GlodaUtils.parseMailAddresses([aMsgHdr.recipients, aMsgHdr.ccList, aMsgHdr.bccList].join(', ')).fullAddresses.join(', ');
      return this.getRegEx(aSearchValue).test(to) ^ (aSearchOp == Ci.nsMsgSearchOp.DoesntMatch);
    };

    let toSomebodyOnly = new CustomerTermBase("toSomebodyOnly", [Ci.nsMsgSearchOp.Contains, Ci.nsMsgSearchOp.DoesntContain]);
    toSomebodyOnly.match = function (aMsgHdr, aSearchValue, aSearchOp) {
      // https://bugzilla.mozilla.org/show_bug.cgi?id=522886 / https://bugzilla.mozilla.org/show_bug.cgi?id=699588
      let mailRecipients = GlodaUtils.parseMailAddresses((aMsgHdr.mime2DecodedRecipients).toLowerCase());//aMsgHdr.mime2DecodedTo ||
      let searchRecipients = GlodaUtils.parseMailAddresses(aSearchValue.toLowerCase());
      let match = (mailRecipients.count == searchRecipients.count);
      match = match && searchRecipients.addresses.every(function (searchOne, index, array) {
        // if only:weiw then searchOne will be '', searching using name instead
        if (!searchOne.length) searchOne = searchRecipients.names[index];
        // can't use aMsgHdr.mime2DecodedRecipients.toLowerCase().indexOf() because the recipient may in our addressbook and TB show it's Name instead of address
        return mailRecipients.fullAddresses.some(function (recipientOne, index, array) {
          if (recipientOne.indexOf(searchOne) != -1) return true; // found one in mailRecipients
        });
      });
      return (match ^ (aSearchOp == Ci.nsMsgSearchOp.DoesntContain));
    };

    // case insensitive
    let attachmentNameOrType = new BodyTermBase("attachmentNameOrType", [Ci.nsMsgSearchOp.Contains, Ci.nsMsgSearchOp.DoesntContain], function (emitterInstance, aSearchOp) {
      if (!emitterInstance.haveAttachment) return false; // always return false when no attachment
      return emitterInstance.found ^ (aSearchOp == Ci.nsMsgSearchOp.DoesntMatch);
    });

    let bodyRegex = new BodyTermBase("bodyRegex", [Ci.nsMsgSearchOp.Matches, Ci.nsMsgSearchOp.DoesntMatch], function (emitterInstance, aSearchOp) {
      return emitterInstance.found ^ (aSearchOp == Ci.nsMsgSearchOp.DoesntMatch);
    });

    /*
    var gCustomSearchTermSubject = {
    id: "mailnews@mozilla.org#test",
    name: "Test-mailbase Subject",
    getEnabled(scope, op) {
      return true;
    },
    getAvailable(scope, op) {
      return true;
    },
    getAvailableOperators(scope) {
      return [Ci.nsMsgSearchOp.Contains];
    },
    match(aMsgHdr, aSearchValue, aSearchOp) {
      return aMsgHdr.subject.includes(aSearchValue);
    },
    needsBody: false,
  };
    
    */

    /*  
      let XNote = 
      
      {
        id: "expressionsearch#XNote",
        name: "XNote",
        getEnabled(scope, op) {
          return true;
        },
        getAvailable(scope, op) {
          return true;
        },
        getAvailableOperators(scope) {
          return [Ci.nsMsgSearchOp.Contains];
        },
       
        needsBody: false
      };
    */

    let XNote = new CustomerTermBase("XNote", [Ci.nsMsgSearchOp.Contains, Ci.nsMsgSearchOp.DoesntContain, Ci.nsMsgSearchOp.BeginsWith]);
    XNote.match = function (aMsgHdr, aSearchValue, aSearchOp) {
 if (typeof (xnote) == "undefined") var { xnote } = ChromeUtils.import("resource://expressionsearch/modules/xnotestore.jsm");
     if (!xnote.XNotesInstalled) return true; //all msgs are ok
      // let resp = await ExpressionSearchCommon.notifyBackground({command: "xnote", hdrID:aMsgHdr.messageId});
      // console.log("note", resp, resp.includes(aSearchValue),aSearchValue.toLowerCase(),resp.toLowerCase(),resp.toLowerCase().includes(aSearchValue.toLowerCase()));
      //console.log("WE",xnote.test); 
      /*
//      console.log("hdr", aMsgHdr, aSearchValue);
  
  */
      //   return false; //((resp.toLowerCase().includes(aSearchValue.toLowerCase())) ); //((resp.toLowerCase()).includes(aSearchValue.toLowerCase()));// ^ (aSearchOp == Ci.nsMsgSearchOp.DoesntContain);
      //   return false; //((resp.toLowerCase().includes(aSearchValue.toLowerCase())) ); //((resp.toLowerCase()).includes(aSearchValue.toLowerCase()));// ^ (aSearchOp == Ci.nsMsgSearchOp.DoesntContain);
      let retval = false;
   //   console.log("hdr", aMsgHdr, aSearchValue, xnote, "searchOp", aSearchOp);

   if (aSearchValue == "*") {
    //we show (not) all msgs having xnotes

    retval = typeof (xnote.notes[aMsgHdr.messageId]) != "undefined";
    return retval ^ (aSearchOp == Ci.nsMsgSearchOp.DoesntContain);
  };


      if (typeof (xnote.notes[aMsgHdr.messageId]) == "undefined") {
 //       console.log("no xnote", aMsgHdr.messageId);
        return false; //no xnote for this msg
      }
      else
  //      console.log("with xnote", aMsgHdr.messageId, xnote.notes[aMsgHdr.messageId], aSearchValue)
         ;




      if (aSearchOp == Ci.nsMsgSearchOp.BeginsWith) {
        retval = xnote.notes[aMsgHdr.messageId].text.toLowerCase().startsWith(aSearchValue.toLowerCase());
  //      console.log("begin", retval, aMsgHdr.messageId);
        return retval;//((resp.toLowerCase()).indexOf((aSearchValue.toLowerCase())) != -1) ^ (aSearchOp == Ci.nsMsgSearchOp.DoesntContain);  

      };

      //if here, is contains or doesntcontain
   //   console.log("df", aSearchValue, xnote.notes[aMsgHdr.messageId], xnote.notes[aMsgHdr.messageId].text, xnote.notes);
      retval = xnote.notes[aMsgHdr.messageId].text.toLowerCase().indexOf((aSearchValue.toLowerCase())) != -1;
   //   console.log("ret", aMsgHdr.messageId, retval, retval ^ (aSearchOp == Ci.nsMsgSearchOp.DoesntContain));
      return retval ^ (aSearchOp == Ci.nsMsgSearchOp.DoesntContain);//((resp.toLowerCase()).indexOf((aSearchValue.toLowerCase())) != -1) ^ (aSearchOp == Ci.nsMsgSearchOp.DoesntContain);  
    };


    if (!MailServices.filters.getCustomTerm("expressionsearch#Bcc")) { MailServices.filters.addCustomTerm(bccSearch); }
    if (!MailServices.filters.getCustomTerm("expressionsearch#toSomebodyOnly")) { MailServices.filters.addCustomTerm(toSomebodyOnly); }
    if (!MailServices.filters.getCustomTerm("expressionsearch#subjectRegex")) { MailServices.filters.addCustomTerm(subjectRegex); }
    if (!MailServices.filters.getCustomTerm("expressionsearch#subjectSimple")) { MailServices.filters.addCustomTerm(subjectSimple); }
    if (!MailServices.filters.getCustomTerm("expressionsearch#headerRegex")) { MailServices.filters.addCustomTerm(headerRegex); }
    if (!MailServices.filters.getCustomTerm("expressionsearch#fromRegex")) { MailServices.filters.addCustomTerm(fromRegex); }
    if (!MailServices.filters.getCustomTerm("expressionsearch#toRegex")) { MailServices.filters.addCustomTerm(toRegex); }
    if (!MailServices.filters.getCustomTerm("expressionsearch#dayTime")) { MailServices.filters.addCustomTerm(dayTime); }
    if (!MailServices.filters.getCustomTerm("expressionsearch#dateMatch")) { MailServices.filters.addCustomTerm(dateMatch); }
    if (!MailServices.filters.getCustomTerm("expressionsearch#attachmentNameOrType")) { MailServices.filters.addCustomTerm(attachmentNameOrType); }
    if (!MailServices.filters.getCustomTerm("expressionsearch#bodyRegex")) { MailServices.filters.addCustomTerm(bodyRegex); }
    if (!MailServices.filters.getCustomTerm("expressionsearch#XNote")) { MailServices.filters.addCustomTerm(XNote); }

  })()

let ExpressionSearchFilter = {
  name: "expression-search-filter",
  domId: "expression-search-textbox",

  // request to create virtual folder, set to the ExpressionSearchChrome when need to create
  latchQSFolderReq: 0,

  appendTerms: function (aTermCreator, aTerms, aFilterValue) {
    try {
      // we're in javascript modules, no window object, so first find the top window
      let topWin = {};
      if (aTermCreator && aTermCreator.window && aTermCreator.window.domWindow && aTermCreator.window.domWindow.ExpressionSearchChrome)
        topWin = aTermCreator.window.domWindow;
      else
        topWin = Services.wm.getMostRecentWindow("mail:3pane");

      if (!aFilterValue.text || aFilterValue.text.toLowerCase().indexOf('g:') == 0) return;
   //   console.log("filtval", topWin.QuickFilterBarMuxer.activeFilterer.filterValues);
      // check if in normal filter mode
      if (ExpressionSearchChrome.options.act_as_normal_filter) {
        let checkColon = new RegExp('(?:^|\\b)(?:' + ExpressionSearchTokens.allTokens + '):', 'g');
        if (!checkColon.test(aFilterValue.text)) { // can't find any my token
          let QuickFilterBarMuxer = topWin.QuickFilterBarMuxer;
          // Use normalFilter's appendTerms to create search term
          let normalFilterState = QuickFilterBarMuxer.activeFilterer.filterValues['text'];
          let originalText = normalFilterState.text;
          normalFilterState.text = aFilterValue.text;
          let normalFilter = QuickFilterManager.filterDefsByName['text'];
          normalFilter.appendTerms.apply(normalFilter, [aTermCreator, aTerms, normalFilterState]);
          ExpressionSearchChrome.showHideHelp(topWin, true, undefined, undefined, undefined, this.getSearchTermString(aTerms));
          normalFilterState.text = originalText;
          topWin.document.getElementById("quick-filter-bar-filter-text-bar").collapsed = false;
          return;
        } else {
          let normalFilterBox = topWin.document.getElementById("qfb-qs-textbox");
          if (normalFilterBox && normalFilterBox.value == "")
            topWin.document.getElementById("quick-filter-bar-filter-text-bar").collapsed = true;
        }
      }

      // first remove trailing specifications if it's empty
      // then remove trailing ' and' but no remove of "f: and"
      let regExpReplace = new RegExp('(?:^|\\s+)(?:' + ExpressionSearchTokens.allTokens + '):(?:\\(|)\\s*$', "i");
      let regExpSearch = new RegExp('\\b(?:' + ExpressionSearchTokens.allTokens + '):\\s+and\\s*$', "i");
      var aSearchString = aFilterValue.text.replace(regExpReplace, '');
      if (!regExpSearch.test(aSearchString)) {
        aSearchString = aSearchString.replace(/\s+\and\s*$/i, '');
      }
      aSearchString.replace(/\s+$/, '');
      if (aSearchString == '') return;
      var e = ExpressionSearchComputeExpression(aSearchString);
      if (ExpressionSearchFilter.latchQSFolderReq) {
        let terms = aTerms.slice();
        ExpressionSearchFilter.createSearchTermsFromExpression(e, aTermCreator, terms);
        ExpressionSearchFilter.latchQSFolderReq.createQuickFolder.apply(ExpressionSearchFilter.latchQSFolderReq, [topWin, terms]);
        ExpressionSearchFilter.latchQSFolderReq = 0;
      } else {
        ExpressionSearchLog.info("Expression Search Statements: " + ExpressionSearchExprToStringInfix(e));
        ExpressionSearchFilter.createSearchTermsFromExpression(e, aTermCreator, aTerms);
        haveBodyMapping = {};
        badREs = {};
        ExpressionSearchChrome.showHideHelp(topWin, true, undefined, undefined, undefined, this.getSearchTermString(aTerms));
      }
    } catch (err) {
      ExpressionSearchLog.logException(err);
    }
  },

  domBindExtra: function (aDocument, aMuxer, aNode) {
    // -- platform-dependent emptytext setup
    let filterNode = aDocument.getElementById('qfb-qs-textbox');
    let quickKey = '';
    let attributeName = "placeholder";
    if (filterNode) {
      quickKey = filterNode.getAttribute(platformIsMac ? "keyLabelMac" : "keyLabelNonMac");
      // now Ctrl+F will focus to our input, so remove the message in builtin one
      filterNode.setAttribute(attributeName, filterNode.getAttribute("emptytextbase").replace("#1", ''));
      // force to update the message
      filterNode.value = '';
    }
    aNode.setAttribute(attributeName, aNode.getAttribute("emptytextbase").replace("#1", quickKey));
    // force an update of the emptytext now that we've updated it.
    aNode.value = "";
  },

  getDefaults: function () { // this function get called pretty early
    return {
      text: null,
    };
  },

  propagateState: function (aOld, aSticky) {
    return {
      // must clear state when create quick search folder, or recursive call happenes when aSticky.
      text: (aSticky && !ExpressionSearchFilter.latchQSFolderReq && typeof (aOld) != 'undefined') ? aOld.text : null,
      //states: {},
    };
  },

  onCommand: function (aState, aNode, aEvent, aDocument) { // may get skipped when init, but appendTerms get called
    let text = aNode.value.length ? aNode.value : null;
    aState = aState || {}; // or will be no search.
    let needSearch = false;
    if (ExpressionSearchChrome.isEnter) {
      // press Enter to select searchInput
      aNode.select();
      // if text not null and create qs folder return true
      if (text && ExpressionSearchFilter.latchQSFolderReq) {
        needSearch = true;
      }
    }
    if (text != aState.text) {
      aState.text = text;
      needSearch = true;
    }
    if (!needSearch && ExpressionSearchChrome.isEnter && ExpressionSearchChrome.options.select_msg_on_enter) // else the first message will be selected in reflectInDom
      ExpressionSearchChrome.selectFirstMessage(aDocument.defaultView, true);
    return [aState, needSearch];
  },

  // change DOM status, eg disabled, checked, etc.
  // by AMuxer.onActiveAllMessagesLoaded or reflectFiltererState
  reflectInDOM: function (
    aNode,
    aFilterValue, // aFilterValue is the 1st value PFT returns
    aDocument,
    aMuxer,
    aFromPFP
  ) {
    //PFP: PostFilterProcess, the second value PFP returns
    // Update the text if it has changed (linux does weird things with empty
    //  text if we're transitioning emptytext to emptytext)
    let desiredValue = "";
    if (aFilterValue && aFilterValue.text)
      desiredValue = aFilterValue.text;
    if (aNode.value != desiredValue && !aFromPFP)
      aNode.value = desiredValue;

    ExpressionSearchChrome.showHideHelp(aDocument.defaultView, false);

    let total = Object.keys(haveBodyMapping).length;
    if (total && aNode.value != '') {
      let haveBody = 0, haveNoBody = 0;
      for (let key in haveBodyMapping) {
        if (haveBodyMapping[key]) haveBody++;
      }
      haveNoBody = total - haveBody;
      aNode.setAttribute("tooltiptext", "Searched " + total + " messages, " + haveBody + " have body, " + haveNoBody + " haven't");
    } else aNode.removeAttribute("tooltiptext");

    let panel = aDocument.getElementById("qfb-text-search-upsell");
    if (aFromPFP == "upsell") {
      let searchString = ExpressionSearchFilter.expression2gloda(aFilterValue.text);
      let line1 = aDocument.getElementById("qfb-upsell-line-one");
      let line2 = aDocument.getElementById("qfb-upsell-line-two");
      line1.value = line1.getAttribute("fmt").replace("#1", searchString);
      line2.value = line2.getAttribute("fmt").replace("#1", searchString);
      if (panel.state == "closed" && aDocument.commandDispatcher.focusedElement == aNode.inputField)
        panel.openPopup(aNode, "after_start", -7, 7, false, true);
      return;
    }

    if (panel.state != "closed")
      panel.hidePopup();

    ExpressionSearchChrome.selectFirstMessage(aDocument.defaultView, ExpressionSearchChrome.isEnter && ExpressionSearchChrome.options.select_msg_on_enter);
  },

  postFilterProcess: function (aState, aViewWrapper, aFiltering) {
    // If we're not filtering, not filtering on text, there are results, or
    //  gloda is not enabled so upselling makes no sense, then bail.
    // (Currently we always return "nosale" to make sure our panel is closed;
    //  this might be overkill but unless it becomes a performance problem, it
    //  keeps us safe from weird stuff.)
    // ExpressionSearchLog.log( 'aViewWrapper.dbView:'+aViewWrapper.dbView.viewType+":"+aViewWrapper.dbView.numMsgsInView + ":" + aViewWrapper.dbView.rowCount + ":" + aViewWrapper.dbView.viewFlags );
    if (!aFiltering || !aState || !aState.text || !aViewWrapper || aViewWrapper.dbView.numMsgsInView || aViewWrapper.dbView.rowCount /* Bug 574799 */ || !GlodaIndexer.enabled)
      return [aState, "nosale", false];

    // since we're filtering, filtering on text, and there are no results, tell the upsell code to get bizzay
    return [aState, "upsell", false];
  },

  addSearchTerm: function (aTermCreator, searchTerms, str, attr, op, is_or, grouping) {
    let aCustomId;
    if (typeof (attr) == 'object' && attr.type == Ci.nsMsgSearchAttrib.Custom) {
      aCustomId = attr.customId;
      attr = Ci.nsMsgSearchAttrib.Custom;
    }
    var term, value;
    term = aTermCreator.createTerm();
    term.attrib = attr;
    value = term.value;
    // This is tricky - value.attrib must be set before actual values, from searchTestUtils.js 
    value.attrib = attr;

    if (attr == Ci.nsMsgSearchAttrib.JunkPercent)
      value.junkPercent = str;
    else if (attr == Ci.nsMsgSearchAttrib.Priority)
      value.priority = str;
    else if (attr == Ci.nsMsgSearchAttrib.Date)
      value.date = str;
    else if (attr == Ci.nsMsgSearchAttrib.MsgStatus || attr == Ci.nsMsgSearchAttrib.FolderFlag || attr == Ci.nsMsgSearchAttrib.Uint32HdrProperty)
      value.status = str;
    else if (attr == Ci.nsMsgSearchAttrib.MessageKey)
      value.msgKey = str;
    else if (attr == Ci.nsMsgSearchAttrib.Size)
      value.size = str;
    else if (attr == Ci.nsMsgSearchAttrib.AgeInDays)
      value.age = str;
    else if (attr == Ci.nsMsgSearchAttrib.Label)
      value.label = str;
    else if (attr == Ci.nsMsgSearchAttrib.JunkStatus)
      value.junkStatus = str;
    else if (attr == Ci.nsMsgSearchAttrib.HasAttachmentStatus)
      value.status = Ci.nsMsgMessageFlags.Attachment;
    else
      value.str = str;

    term.value = value;
    term.op = op;
    term.booleanAnd = !is_or;

    if (attr == Ci.nsMsgSearchAttrib.Custom)
      term.customId = aCustomId;
    else if (attr == Ci.nsMsgSearchAttrib.OtherHeader)
      term.arbitraryHeader = aArbitraryHeader;
    else if (attr == Ci.nsMsgSearchAttrib.HdrProperty || attr == Ci.nsMsgSearchAttrib.Uint32HdrProperty)
      term.hdrProperty = aHdrProperty;

    searchTerms.push(term);
  },

  get_key_from_tag: function (myTag) {
    if (myTag == 'na') return myTag;
    let tagArray = MailServices.tags.getAllTags({});
    // consider two tags, one is "ABC", the other is "ABCD", when searching for "AB", perfect is return both.
    // however, that need change the token tree.
    // so here I just return the best fit "ABC".
    let uniqueKey = '', myTagLen = myTag.length, lenDiff = Number.MAX_VALUE;
    for (let tagObject of tagArray) {
      let tag = tagObject.tag.toLowerCase();
      if (tag.indexOf(myTag) >= 0 && (tag.length - myTagLen < lenDiff)) {
        uniqueKey = tagObject.key;
        lenDiff = tag.length - myTagLen;
        if (lenDiff == 0) break;
      }
    }
    if (uniqueKey != '') return uniqueKey;
    // if user provide '#3' or '3', use it, suggested by fluxs
    let match = myTag.match(/^#*(\d+)$/);
    if (match.length == 2) {
      let [, index] = match;
      index--; // 0 based
      if (index >= 0 && index < tagArray.length) return tagArray[index].key;
    }
    return "..unknown..";
  },

  expression2gloda: function (searchValue) {
    searchValue = searchValue.replace(/^g:\s*/i, '');
    let regExp = new RegExp("(?:^|\\b)(?:" + ExpressionSearchTokens.allTokens + "):", "g");
    searchValue = searchValue.replace(regExp, '');
    searchValue = searchValue.replace(/(?:\b|^)(?:and|or)(?:\b|$)/g, '').replace(/[()]/g, '');
    return searchValue;
  },

  getSearchTermString: function (searchTerms) {
    let condition = "";
    searchTerms.forEach(function (searchTerm, index, array) {
      if (index > 0) condition += " ";
      if (searchTerm.matchAll)
        condition += "ALL";
      else {
        condition += searchTerm.booleanAnd ? "AND" : "OR";
        condition += searchTerm.beginsGrouping && !searchTerm.endsGrouping ? " {" : "";
      }
      let converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
      converter.charset = 'UTF-8';
      let termString = converter.ConvertToUnicode(searchTerm.termAsString); // termAsString is ACString
      condition += " (" + termString + ")";
      // "}" may not balanced with "{", but who cares
      condition += searchTerm.endsGrouping && !searchTerm.beginsGrouping ? " }" : "";
    });
    return condition;
  },

  convertExpression: function (e, aTermCreator, searchTerms, was_or) {
    var is_not = false, begins_with = false;
    if (e.kind == 'op' && e.tok == '-') {
      if (e.left.kind != 'spec') {
        ExpressionSearchLog.log('Exression Search: unexpected expression tree', 1);
        return;
      }
      e = e.left;
      is_not = true;
      begins_with = false;
    }
    if (e.kind == 'op' && e.tok == '^') {
      if (e.left.kind != 'spec') {
        ExpressionSearchLog.log('Exression Search: unexpected expression tree', 1);
        return;
      }
      e = e.left;
      is_not = false;
      begins_with = true;
    }
    if (e.kind == 'spec') {
      let attr;
      let op = is_not ? Ci.nsMsgSearchOp.DoesntContain : Ci.nsMsgSearchOp.Contains; //if is_not, then cannot be begin_with
      op = begins_with ? Ci.nsMsgSearchOp.BeginsWith : op; //we don't have not begin_with
      if (e.tok == 'from') attr = Ci.nsMsgSearchAttrib.Sender;
      else if (e.tok == 'fromto') attr = Ci.nsMsgSearchAttrib.AllAddresses;
      else if (e.tok == 'to') attr = Ci.nsMsgSearchAttrib.ToOrCC;
      else if (e.tok == 'tonocc') attr = Ci.nsMsgSearchAttrib.To;
      else if (e.tok == 'cc') attr = Ci.nsMsgSearchAttrib.CC;
      else if (e.tok == 'days' || e.tok == 'older_than' || e.tok == 'newer_than') attr = Ci.nsMsgSearchAttrib.AgeInDays;
      // AllAddresses,AnyText,Size,Name,DisplayName,Nickname,ScreenName,Email,AdditionalEmail
      else if (e.tok == 'subject') attr = Ci.nsMsgSearchAttrib.Subject;
      else if (e.tok == 'bcc') attr = { type: Ci.nsMsgSearchAttrib.Custom, customId: 'expressionsearch#Bcc' };
      else if (e.tok == 'only') attr = { type: Ci.nsMsgSearchAttrib.Custom, customId: 'expressionsearch#toSomebodyOnly' };
      else if (e.tok == 'simple') attr = { type: Ci.nsMsgSearchAttrib.Custom, customId: 'expressionsearch#subjectSimple' };
      else if (e.tok == 'regex') attr = { type: Ci.nsMsgSearchAttrib.Custom, customId: 'expressionsearch#subjectRegex' };
      else if (e.tok == 'headerre') attr = { type: Ci.nsMsgSearchAttrib.Custom, customId: 'expressionsearch#headerRegex' };
      else if (e.tok == 'date') attr = { type: Ci.nsMsgSearchAttrib.Custom, customId: 'expressionsearch#dateMatch' };
      else if (e.tok == 'filename') attr = { type: Ci.nsMsgSearchAttrib.Custom, customId: 'expressionsearch#attachmentNameOrType' };
      else if (e.tok == 'bodyre') attr = { type: Ci.nsMsgSearchAttrib.Custom, customId: 'expressionsearch#bodyRegex' };
      else if (e.tok == 'fromre') attr = { type: Ci.nsMsgSearchAttrib.Custom, customId: 'expressionsearch#fromRegex' };
      else if (e.tok == 'tore') attr = { type: Ci.nsMsgSearchAttrib.Custom, customId: 'expressionsearch#toRegex' };
      else if (e.tok == 'body') attr = Ci.nsMsgSearchAttrib.Body;
      else if (e.tok == 'attachment') attr = Ci.nsMsgSearchAttrib.HasAttachmentStatus;
      else if (e.tok == 'status') attr = Ci.nsMsgSearchAttrib.MsgStatus;
      else if (e.tok == 'size' || e.tok == 'smaller') attr = Ci.nsMsgSearchAttrib.Size;
      else if (e.tok == 'before' || e.tok == 'after') attr = Ci.nsMsgSearchAttrib.Date;
      else if (e.tok == 'xnote') attr = { type: Ci.nsMsgSearchAttrib.Custom, customId: 'expressionsearch#XNote' };
      else if (e.tok == 'tag') {
        e.left.tok = this.get_key_from_tag(e.left.tok.toLowerCase());
        attr = Ci.nsMsgSearchAttrib.Keywords;
        if (e.left.tok.toLowerCase() == 'na') op = is_not ? Ci.nsMsgSearchOp.IsntEmpty : Ci.nsMsgSearchOp.IsEmpty;
      } else if (e.tok == 'calc') {
        return;
      } else { ExpressionSearchLog.log('Exression Search: unexpected specifier', 1); return; }
      if (e.left.kind != 'str') {
        ExpressionSearchLog.log('Exression Search: unexpected expression tree', 1);
        return;
      }
      if (e.tok == 'attachment') {
        if (!/^(?:y|1|n|0|yes|no)$/i.test(e.left.tok)) { // treat as filename
          e.tok = 'filename';
          attr = { type: Ci.nsMsgSearchAttrib.Custom, customId: 'expressionsearch#attachmentNameOrType' };
        } else if (!/^[Yy1]/.test(e.left.tok)) {
          // looking for no attachment; reverse is_not.
          is_not = !is_not;
        }
      }
      if (attr == Ci.nsMsgSearchAttrib.Date) {
        // is before: before => false, true: true
        // is after: after   => false, false: false
        // isnot before: after => true, ture: false
        // isnot after: before => true, false: true
        op = (is_not ^ (e.tok == 'before')) ? Ci.nsMsgSearchOp.IsBefore : Ci.nsMsgSearchOp.IsAfter;
        let inValue = e.left.tok;
        let dayTimeRe = /^\s*((\d{1,2}):(\d{1,2})(:(\d{1,2})){0,1})\s*$/;
        if (dayTimeRe.test(inValue)) { // dayTime
          let newTime = inValue.replace(dayTimeRe, '$2:$3:$5');
          if (/:$/.test(newTime)) newTime += '0';
          let timeArray = newTime.split(':');
          let invalidTime = false;
          timeArray.forEach(function (item, index, array) {
            // change to 00:00:00 format
            if (item.length == 1) {
              item = "0" + item;
              array[index] = item;
            }
            if ((index == 0 && item > '23') || (index > 0 && item > '61')) { // 61 is for leap seconds ;-)
              if (!invalidTime)
                ExpressionSearchLog.log('Expression Search: dayTime ' + inValue + " is not valid", 1);
              invalidTime = true;
            }
          });
          if (invalidTime) return;
          e.left.tok = timeArray.join(":");
          attr = { type: Ci.nsMsgSearchAttrib.Custom, customId: 'expressionsearch#dayTime' };
        } else try { // normal date
          let date = new Date(inValue);
          e.left.tok = date.getTime() * 1000; // why need *1000, I don't know ;-)
          if (isNaN(e.left.tok)) {
            ExpressionSearchLog.log('Expression Search: date ' + inValue + " is not valid", 1);
            return;
          }
        } catch (err) {
          ExpressionSearchLog.logException(err);
          return;
        }
      }
      if (e.tok == 'status') {
        if (/^Rep/i.test(e.left.tok))
          e.left.tok = Ci.nsMsgMessageFlags.Replied;
        else if (/^Rea/i.test(e.left.tok))
          e.left.tok = Ci.nsMsgMessageFlags.Read;
        else if (/^M/i.test(e.left.tok))
          e.left.tok = Ci.nsMsgMessageFlags.Marked;
        else if (/^Star/i.test(e.left.tok))
          e.left.tok = Ci.nsMsgMessageFlags.Marked;
        else if (/^F/i.test(e.left.tok))
          e.left.tok = Ci.nsMsgMessageFlags.Forwarded;
        else if (/^N/i.test(e.left.tok))
          e.left.tok = Ci.nsMsgMessageFlags.New;
        else if (/^(?:I|D)/i.test(e.left.tok))
          e.left.tok = Ci.nsMsgMessageFlags.ImapDeleted;
        else if (/^A/i.test(e.left.tok))
          e.left.tok = Ci.nsMsgMessageFlags.Attachment;
        else if (/^UnR/i.test(e.left.tok)) {
          e.left.tok = Ci.nsMsgMessageFlags.Read;
          is_not = !is_not;
        } else {
          ExpressionSearchLog.log('Expression Search: unknown status ' + e.left.tok, 1);
          return;
        }
      }
      if (attr == Ci.nsMsgSearchAttrib.AgeInDays) { // age==days==older_than/newer_than 2y,3m,5d,6,-8
        if (e.tok == 'newer_than') is_not = !is_not;
        // today == -1, yesterday == -2, day == '', week *=7, month *= 30?, year *= 365
        let match = e.left.tok.match(/^([-.\d]*)(\w*)/);
        if (match.length == 3) {
          let [, days, period] = match;
          if (days == '') days = 1;
          if (period == '') period = 1;
          if (/^t/i.test(period)) { // today
            period = 1;
            is_not = !is_not;
          } else if (/^yes/i.test(period)) {
            period = 2;
            is_not = !is_not;
          } else if (/^d/i.test(period)) {
            period = 1;
          } else if (/^w/i.test(period)) {
            period = 7;
          } else if (/^m/i.test(period)) {
            period = 30.4369;
          } else if (/^yea/i.test(period)) {
            period = 365.2425;
          }
          e.left.tok = days * period;
        }
      }
      if (attr == Ci.nsMsgSearchAttrib.Size) {
        if (e.tok == 'smaller') is_not = !is_not;
        op = is_not ? Ci.nsMsgSearchOp.IsLessThan : Ci.nsMsgSearchOp.IsGreaterThan;
        let match = e.left.tok.match(/^([-.\d]*)(\w*)/i); // default KB, can be M,G
        if (match.length == 3) {
          let [, size, scale] = match;
          if (scale == '') scale = 1;
          if (/^m/i.test(scale)) {
            scale = 1024;
          } else if (/^G/i.test(scale)) {
            scale = 1024 * 1024;
          } else if (/^K/i.test(scale)) {
            scale = 1;
          } else if (scale != 1) {
            ExpressionSearchLog.log("unknow size scale:'" + scale + "', can be K,M,G", 1);
            return;
          }
          e.left.tok = size * scale;
        }
      }
      // else if (e.tok == 'size' || e.tok == 'smaller') ;
      if (e.tok == 'attachment' || e.tok == 'status')
        op = is_not ? Ci.nsMsgSearchOp.Isnt : Ci.nsMsgSearchOp.Is;
      else if (e.tok == 'date' || e.tok == 'headerre')
        op = is_not ? Ci.nsMsgSearchOp.DoesntMatch : Ci.nsMsgSearchOp.Matches;
      else if (attr == Ci.nsMsgSearchAttrib.AgeInDays)
        op = is_not ? Ci.nsMsgSearchOp.IsLessThan : Ci.nsMsgSearchOp.IsGreaterThan;
      else if (e.tok == 'regex' || e.tok == 'bodyre') {
        op = is_not ? Ci.nsMsgSearchOp.DoesntMatch : Ci.nsMsgSearchOp.Matches;
        // check regex
        let utils = new UtilsBase();
        // static does not work, because the other consumers cannot call static members.
        utils.getRegEx(e.left.tok);
      }

      this.addSearchTerm(aTermCreator, searchTerms, e.left.tok, attr, op, was_or);
      return;
    }
    if (e.left != undefined)
      this.convertExpression(e.left, aTermCreator, searchTerms, was_or);
    if (e.right != undefined)
      this.convertExpression(e.right, aTermCreator, searchTerms, e.kind == 'op' && e.tok == 'or');
  },
  createSearchTermsFromExpression: function (e, aTermCreator, searchTerms) {
    // start converting the search expression.  Every search term
    // has an and or or field in it.  My current understanding is
    // that it's what this term should be preceded by.  Of course it
    // doesn't apply to the first term, but it appears the search
    // dialog uses it to set the radio button.  The dialog cannot
    // possibly deal with anything but expressions that are all one
    // or the other logical operator, but at least if the user gives
    // us an expression that is only or's, let's use the or value
    // for the type of the first term (second param to
    // convertExpression).  You can prove that the top expression
    // node will only be an 'or' if all operators are ors.
    this.convertExpression(e, aTermCreator, searchTerms, e.kind == 'op' && e.tok == 'or');

    // Add grouping attributes.  Look for the beginning and end of
    // each disjunct and mark it with grouping
    var firstDJTerm = -1;
    var priorTerm = null;

    for (var i = 0; i < searchTerms.length; i++) {
      if (!searchTerms[i].booleanAnd) {
        if (priorTerm != null) {
          firstDJTerm = i - 1;
          priorTerm.beginsGrouping = true;
        }
      } else {
        if (firstDJTerm != -1) {
          priorTerm.endsGrouping = true;
          firstDJTerm = -1;
        }
      }
      priorTerm = searchTerms[i];
    }
    if (firstDJTerm != -1) {
      priorTerm.endsGrouping = true;
      firstDJTerm = -1;
    }
    ExpressionSearchLog.info("Expression Search Terms: " + this.getSearchTermString(searchTerms));
    return null;
  },

} // end of ExpressionSearchFilter define

