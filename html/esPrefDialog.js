// Changes for TB 78+ (c) by Klaus Buecher/opto 2020-2021
// MPL 2.0

"use strict";

async function onLoad() {
  await preferences.load();

  // The virtual_folder_path setting was loaded into the data-value attribute its
  // UI element (p or div), triggered by the data-value attribute being included in the DOM.
  // Prepare that information for display.
  let vfpElement = window.document.getElementById("virtual_folder_path");
  let vfpValue = {};
  try {
    vfpValue = JSON.parse(vfpElement.dataset.value)
  } catch (ex) {
    // Migrate old values?
  }
  await updateVirtualFolderElement(vfpValue);

  async function updateVirtualFolderElement(vfpValue) {
    let vfpElement = window.document.getElementById("virtual_folder_path");
    if (vfpValue.accountId) {
      let account = await browser.accounts.get(vfpValue.accountId)
      vfpElement.textContent = `${account.name}:/${vfpValue.path}`
      vfpElement.dataset.value = JSON.stringify(vfpValue);
    } else {
      vfpElement.textContent = browser.i18n.getMessage("option.use_root_folder");
      vfpElement.dataset.value = JSON.stringify({});
    }
  }

  function appendSubFolderEntries(parent, subfolders) {
    if (!subfolders || subfolders.length == 0) {
      return;
    }
    let ul = document.createElement('ul');
    for (let folder of subfolders) {
      let li = document.createElement('li');
      let a = document.createElement('a');
      a.addEventListener("click", () => updateVirtualFolderElement(folder))
      a.textContent = folder.name;
      li.appendChild(a);
      appendSubFolderEntries(li, folder.subFolders);
      ul.appendChild(li);
    }
    parent.appendChild(ul);
  }

  // Populate the folder widget.
  let accounts = await browser.accounts.list();
  let vfpMenu = window.document.getElementById("virtual_folder_popup");
  let li = document.createElement('li');
  let a = document.createElement('a');
  a.addEventListener("click", () => updateVirtualFolderElement({}))
  a.textContent = browser.i18n.getMessage("option.use_root_folder");
  li.appendChild(a);
  vfpMenu.appendChild(li);

  for (let account of accounts) {
    let li = document.createElement('li');
    let a = document.createElement('a');
    a.addEventListener("click", () => updateVirtualFolderElement({ accountId: account.id, path: "/" }))
    a.textContent = account.name;
    li.appendChild(a);
    appendSubFolderEntries(li, account.folders);
    vfpMenu.appendChild(li);
  }
  PopupMenuManager.load();

  let links = {
    "c2s_replace_title_textlink": {
      type: "window",
      url: translateURL("expressionsearch.helpfile", "#c2s_Replace")
    },
    "expressionsearch-pane-help-paypal-link": {
      type: "external",
      url: "https://www.paypal.com/donate?hosted_button_id=EMVA9S5N54UEW"
    },
    "expressionsearch-pane-help-file-textlink": {
      type: "window",
      url: translateURL("expressionsearch.helpfile")
    },
    "expressionsearch-pane-help-github-textlink": {
      type: "external",
      url: "https://github.com/opto/expression-search-NG/issues"
    },
    "reuse_existing_folder-textlink": {
      type: "window",
      url: translateURL("expressionsearch.helpfile", "#keep_saved_search")
    }
  }

  for (let [id, link] of Object.entries(links)) {
    let element = window.document.getElementById(id);
    if (!element) ExpressionSearchLog.info(`Element ${id} is missing`);
    switch (link.type) {
      case "tab":
        element.addEventListener("click", () => browser.tabs.create({ url: link.url }));
        break;
      case "window":
        element.addEventListener("click", () => browser.windows.create({ url: link.url, type: "popup" }));
        break;
      case "external":
        element.addEventListener("click", () => browser.windows.openDefaultBrowser(link.url));
        break;
    }
  }
}

var preferences = {
  _preferences: [],
  _preferencesLoaded: false,

  _getElementsByAttribute: function (name, value) {
    // If we needed to defend against arbitrary values, we would escape
    // double quotes (") and escape characters (\) in them, i.e.:
    //   ${value.replace(/["\\]/g, '\\$&')}
    return value
      ? window.document.querySelectorAll(`[${name}="${value}"]`)
      : window.document.querySelectorAll(`[${name}]`);
  },


  _setElementValue: async function (preference) {
    let value = await browser.LegacyPrefs.getPref(preference);

    // One preference could have multiple elements, i.e radio buttons.
    let elements = this._getElementsByAttribute("data-preference", preference);
    for (let element of elements) {
      if (element.localName == "input" && ["radio", "checkbox"].includes(element.type)) {
        // Special condition for radio elements (only the one with matching value gets checked).
        element.checked = (element.type == "radio")
          ? (value == element.value)
          : !!value
      } else {
        this._setValue(element, "value", value);
      }
    }
  },

  _getElementValue: async function (preference) {
    // One preference could have multiple elements, i.e radio buttons.
    let elements = this._getElementsByAttribute("data-preference", preference);
    for (let element of elements) {
      let attribute = "value";
      if (element.localName == "input" && ["radio", "checkbox"].includes(element.type)) {
        // Special condition for radio elements (find the checked one).
        if (element.type == "radio") {
          if (element.checked) {
            return this._getValue(element, "value");
          }
          continue;
        } else {
          return this._getValue(element, "checked");
        }
      }
      return this._getValue(element, "value");
    }
  },

  // Set the value of an HTML element.
  _setValue: function (element, attribute, value) {
    if (element.dataset.splitChar) {
      value = value.split(element.dataset.splitChar).map(e => e.trim()).join("\n")
    }

    if (attribute in element.dataset) {
      element.dataset[attribute] = value;
    } else if (attribute in element) {
      element[attribute] = value;
    } else {
      element.setAttribute(attribute, value);
    }
  },

  // Get the value of an HTML element.
  _getValue: function (element, attribute) {
    let rv = element.getAttribute(attribute);
    if (attribute in element) {
      rv = element[attribute];
    }
    if (attribute in element.dataset) {
      rv = element.dataset[attribute];
    }

    if (element.dataset.splitChar) {
      rv.split("\n").map(e => e.replaceAll(" ", "")).join(element.dataset.splitChar)
    }
    return rv;
  },

  // Load preferences into elements.
  load: async function () {
    // Gather all preference elements in this document and load their values.
    const elements = this._getElementsByAttribute("data-preference");
    for (const element of elements) {
      const prefName = element.dataset.preference;
      if (!this._preferences.includes(prefName)) {
        this._preferences.push(prefName);
      }
    }

    for (let preference of this._preferences) {
      await this._setElementValue(preference);
    }

    this._preferencesLoaded = true;

    window.document.getElementById("save").addEventListener("click", () => {
      preferences.save();
    });
  },

  save: async function () {
    if (!this._preferencesLoaded) return;

    for (let preference of this._preferences) {
      let newValue = await this._getElementValue(preference);
      await browser.LegacyPrefs.setPref(preference, newValue);
    }
  },
}


function showPrettyTooltip(URI, pretty) {
  return decodeURIComponent(URI).replace(/(.*\/)[^/]*/, '$1') + pretty;
}

function onFolderPick(aEvent) {
  let gPickedFolder = aEvent.target._folder || aEvent.target;
  let label = gPickedFolder.prettyName || gPickedFolder.label;
  let value = gPickedFolder.URI || gPickedFolder.value;
  let folderPicker = document.getElementById("esNewFolderPicker");
  folderPicker.value = value; // must set value before set label, or next line may fail when previous value is empty
  folderPicker.setAttribute("label", label);
  folderPicker.setAttribute('tooltiptext', showPrettyTooltip(value, label));
}

window.addEventListener("load", onLoad);
