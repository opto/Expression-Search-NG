/* Flex Level Popup Menu
 *
 * Version 1.*
 * -----------
 * Created: Dec 27th, 2009 by DynamicDrive.com. This notice must stay intact for usage 
 * Author: Dynamic Drive at http://www.dynamicdrive.com/
 * Visit http://www.dynamicdrive.com/ for full source code
 * 
 * Version 1.1 (March 5th, 2010): Each flex menu (UL) can now be associated with a link dynamically, and/or defined using JavaScript instead of as markup.
 * Version 1.2 (July 1st, 2011): Menu updated to work properly in popular mobile devices such as iPad/iPhone and Android tablets.
 * 
 * 
 * Version 2.*
 * -----------
 * Modified by John Bieling (john@thunderbird.net)
 * 
 * Version 2.1 (July 7th, 2022): Remove jQuery dependency and animations
 * 
 */

const shiftX = -15;
const shiftY = 3;

function getParents(el, parentSelector) {
  if (parentSelector === undefined) {
    parentSelector = document;
  }
  let parents = [];
  let p = el.parentNode;
  while (p !== parentSelector) {
    let o = p;
    parents.push(o);
    p = o.parentNode;
  }
  parents.push(parentSelector);
  return parents;
}

var PopupMenuManager = {
  // IDs of popup menus already built (to prevent repeated building of same popup menu).
  builtpopupmenuids: [],
  startzindex: 1000,

  load: function () {
    document.querySelectorAll('*[data-popupmenu]').forEach(anchor => {
      PopupMenuManager.init(anchor, document.querySelector('#' + anchor.getAttribute('data-popupmenu')))
    });
  },

  displayUl: function (ul, anchor) {
    // Bool indicating whether ul is top level popup menu element.
    let istoplevel = ul.classList.contains('jqpopupmenu')
    let docrightedge = window.innerWidth - 20; // add a buffer
    let docbottomedge = window.innerHeight - 20;  // add a buffer

    // All clientRects are relative to the  global viewPort. If the view is scrolled,
    // the scroll amount must be added to get the absolute css/page position.
    // The top level ul element css position is absolute to the page, the sublevel
    // ul elements css position is relative to their parent.
    let anchorRect = anchor.getBoundingClientRect();
    let cssX = istoplevel ? document.documentElement.scrollLeft + anchorRect.left : anchorRect.width + shiftX;
    let cssY = istoplevel ? document.documentElement.scrollTop + anchorRect.bottom : shiftY;

    ul.style.left = `${cssX}px`;
    ul.style.top = `${cssY}px`;
    ul.style.display = "block"

    // Adjust the X position, if the element appears off screen.
    if (!istoplevel) {
      let ulRect = ul.getBoundingClientRect();
      if (ulRect.right > docrightedge) {
        ul.style.left = `${cssX - anchorRect.width - ulRect.width - 2 * shiftX}px`;
      }
    }
  },

  buildpopupmenu: function (menu, target) {
    menu.style.zIndex = this.startzindex;
    menu.classList.add('jqpopupmenu');

    // Hide menu when mouse moves out of it.
    menu.addEventListener('mouseleave', function () {
      menu.style.display = "none";
    })

    // Find all LIs within menu with a sub UL.
    let subUls = menu.querySelectorAll("li > ul");
    let i = 0;
    for (let subUl of subUls) {
      let li = subUl.parentElement;

      li.style.zIndex = 1000 + i;
      li.classList.add('arrow');
       // Show sub UL when mouse moves over parent LI.
      li.addEventListener("mouseenter", (e) => {
        let element = e.target;
        element.style.zIndex = ++PopupMenuManager.startzindex;
        let targetul = element.querySelector('ul');
        if (targetul) {
          PopupMenuManager.displayUl(targetul, li);
        }
        element.classList.add("selected");
      })

      // Hide sub UL when mouse moves out of parent LI.
      li.addEventListener('mouseleave', function (e) {
        let targetul = e.target.querySelector('ul');
        if (targetul) {
          targetul.style.display = "none";
        }
        e.target.classList.remove('selected');
      })
    }

    // Remember id of popup menu that was just built.
    this.builtpopupmenuids.push(menu.id)
  },

  init: function (target, popupmenu) {
    // Only bind click event to document once.
    if (this.builtpopupmenuids.length == 0) {
      document.addEventListener("click", function (e) {
        if (e.button == 0) {
          // Hide all popup menus (and their sub ULs) when left mouse button is clicked.
          document.querySelectorAll('.jqpopupmenu').forEach(menu => {
            menu.style.display = "none";
            menu.querySelectorAll('ul').forEach(ul => {
              ul.style.display = "none";
            });
          })
        }
      })
    }

    // Build, if this popup menu hasn't been built yet.
    if (!this.builtpopupmenuids.includes(popupmenu.id)) {
      this.buildpopupmenu(popupmenu, target);
    }

    target.addEventListener("click", async e => {
      e.preventDefault();
      // Let the global click listener close all popups, before we open this one.
      await new Promise(r => window.setTimeout(r));
      popupmenu.style.zIndex = ++PopupMenuManager.startzindex;
      PopupMenuManager.displayUl(popupmenu, target);
    });
  }
}

