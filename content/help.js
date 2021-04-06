/* License:  see License.txt
* Code addtions for TB 78 or later: Creative Commons (CC BY-ND 4.0):
*      Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 

* Contributors:  Klaus Buecher/opto
*/

var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");


addEventListener("click", async (event) => {
   if (event.target.id.startsWith("donate")) {


    let uri = "https://www.paypal.com/donate?hosted_button_id=EMVA9S5N54UEW";
    let url = uri;
    if (!(uri instanceof Ci.nsIURI)) {
      uri = Services.io.newURI(url);
    }
    
    Cc["@mozilla.org/uriloader/external-protocol-service;1"]
      .getService(Ci.nsIExternalProtocolService)
      .loadURI(uri);

//     messenger.Utilities.openLinkExternally("https://www.paypal.com/donate?hosted_button_id=EMVA9S5N54UEW");
   }
});  
