/* License:  see License.txt
* Code addtions for TB 78 or later: Creative Commons (CC BY-ND 4.0):
*      Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 

* Contributors:  Klaus Buecher/opto
*/



addEventListener("click", async (event) => {
   if (event.target.id.startsWith("donate")) {

     messenger.Utilities.openLinkExternally("https://www.paypal.com/donate?hosted_button_id=EMVA9S5N54UEW");
   }
});  
