
/*
 * License:  see License.txt

 * Creative Commons (CC BY-ND 4.0):
 *      Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
 
 * Copyright: Klaus Buecher/opto 2021
 * Contributors:  see Changes.txt
 */


var inp = document.getElementById("search");


addEventListener("click", async (event) => {
  if (event.target.id.startsWith("donate")) {

    messenger.windows.openDefaultBrowser("https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=6K57TUFSNMVSJ&source=url");
  };
  if (event.target.id.startsWith("moreaddons")) {

    // await browser.tabs.create({ url: "/popup/installed.html" });
    let headqq = document.getElementById("optoaddons");
    //  console.log("head", headqq, document);
    headqq.scrollIntoView();
    ;//  messenger.windows.openDefaultBrowser("https://www.google.de");
  };

  if (event.target.id.startsWith("expand")) {

    // await browser.tabs.create({ url: "/popup/installed.html" });
    let headqq = document.getElementById("coll");
    //    console.log("head", headqq, document);
    headqq.style.display = "block";
    headqq = document.getElementById("expand");
    headqq.style.display = "none";
    ;//  messenger.windows.openDefaultBrowser("https://www.google.de");
  };

  if (event.target.id.startsWith("greetingspage")) {

    messenger.tabs.create({ url: "update.html" });
  };
  if (event.target.id.startsWith("addon")) {
    //console.log("ev", event);

    messenger.tabs.create({ url: event.target.value });
  };


});

inp.addEventListener("keyup", async (event) => {
  // if (event.key == " ") 
  {
    messenger.ExpressionSearch.setSearchValue(inp.value);
  };
}, false);


addEventListener("unload", async (event) => {
  //console.log("load");
  //let comms = await browser.commands.getAll();
  //console.log("comm", comms);
  let bgrP = await messenger.extension.getBackgroundPage();
  bgrP.onTop = false;
});


addEventListener("load", async (event) => {
  //console.log("load");
  //let comms = await browser.commands.getAll();
  //console.log("comm", comms);
  let bgrP = await messenger.extension.getBackgroundPage();
  let rep = window.document.getElementById("ontop");
rep.checked = bgrP.onTop;
  let buttons = document.querySelectorAll("button");
  //  console.log("all", buttons);
  buttons[0].addEventListener("click", (e) => {  //Up
    //console.log("butt", e.target.textContent);
    //console.log("inp", inp);
    // messenger.Utilities.openSearchInTab();
    //if ()
    messenger.ExpressionSearch.scrollMessageList(1, -1, 1);
  }, true);
  buttons[1].addEventListener("click", (e) => {   //Down
    //console.log("butt", e.target.textContent);
    //console.log("inp", inp);
    // messenger.Utilities.openSearchInTab();
    //if ()
    messenger.ExpressionSearch.scrollMessageList(1, 1, 1);
  }, true);

  for (let i = 2; i < buttons.length; i++) {
    //   console.log("button", buttons[i]);
    buttons[i].addEventListener("click", (e) => {
      //console.log("butt", e.target.textContent);
      //console.log("inp", inp);
      // messenger.Utilities.openSearchInTab();
      //if ()
      inp.value += " " + e.target.getAttribute("data") + ":";
      messenger.ExpressionSearch.setSearchValue(inp.value);
      inp.focus();
    }, true);

  };
  messenger.ExpressionSearch.getNotes();
  let inp = document.getElementById("search");
  inp.focus();
  window.addEventListener("click", async (event) => {
  //  console.log("search on top");
    let rep = window.document.getElementById("ontop");
//    if (rep.checked)   {
  //    console.log("ontop checked", rep.checked);
      let bgrP = await messenger.extension.getBackgroundPage();
      bgrP.onTop = rep.checked;
  //    console.log("ontop", bgrP.ontop);
      //      };
    });
  
  

});


async function handleMessage(request, sender, sendResponse) {
  command = request.command;
  if (command == "options-setXNote") {
    let xnoteBtn = window.document.getElementById("xnote");
    xnoteBtn.click();
 //   window.focus();
    inp.focus();
  }
}

  messenger.runtime.onMessage.addListener(handleMessage);
