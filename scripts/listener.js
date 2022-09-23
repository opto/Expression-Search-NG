/*
 * Code for TB 78 or later: Creative Commons (CC BY-ND 4.0):
 *      Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0)
 *
 * Copyright: Klaus Buecher/opto 2021
 * Contributors: see Changes.txt
 */

window.document.addEventListener("click", async (event) => {
  if (event.target.tagName == "A") {
    if (event.target.dataset.externalHref) {
      event.preventDefault();
      event.stopPropagation();
      messenger.windows.openDefaultBrowser(event.target.dataset.externalHref);
    }
    if (event.target.dataset.windowHref) {
      event.preventDefault();
      event.stopPropagation();
      let [url, anchor] = event.target.dataset.windowHref.split("#");
      messenger.windows.create({type: "popup", url: translateURL(url, anchor)});
    }



  }
  if (event.target.id.startsWith("addon")) {
    //console.log("ev", event);
     messenger.tabs.create({ url: event.target.value });
  };

});

window.document.addEventListener("DOMContentLoaded", async (event) => {
  // Replace keywords.
  let browserInfo = await browser.runtime.getBrowserInfo();

  let text = document.body.innerHTML
    .replace(/{addon}/g, await browser.runtime.getManifest().name)
    .replace(/{version}/g, await browser.runtime.getManifest().version)
    .replace(/{appver}/g, browserInfo.version);
  document.body.innerHTML = text;

  // Localize.
  i18n.updateDocument();

  // Tooltip support.
  let tooltipElements = window.document.querySelectorAll(`[data-tooltip]`);
  for (const element of tooltipElements) {
    element.addEventListener("mouseover", event => {
      let tooltipId = element.dataset.tooltip;
      if (tooltipId) {
        let [tooltip] = element.querySelectorAll(`#${tooltipId}`);
        tooltip.style.top = `${event.y}px`
        tooltip.style.left = `${event.x + 50}px`
        tooltip.style.display = "block";
      }
    })
    element.addEventListener("mouseout", event => {
      let tooltipId = element.dataset.tooltip;
      if (tooltipId) {
        let [tooltip] = element.querySelectorAll(`#${tooltipId}`);
        tooltip.style.display = "none";
      }
    })
    element.addEventListener("mousemove", event => {
      let tooltipId = element.dataset.tooltip;
      if (tooltipId) {
        let [tooltip] = element.querySelectorAll(`#${tooltipId}`);
        if (tooltip.style.display != "none") {
          tooltip.style.top = `${event.y}px`
          tooltip.style.left = `${event.x + 50}px`
        }
      }
    })
  }
});


/*
 * This file is provided by the addon-developer-support repository at
 * https://github.com/thundernest/addon-developer-support
 *
 * For usage descriptions, please check:
 * https://github.com/thundernest/addon-developer-support/tree/master/scripts/i18n
 *
 * Version: 1.1
 *
 * Derived from:
 * http://github.com/piroor/webextensions-lib-l10n
 *
 * Original license:
 * The MIT License, Copyright (c) 2016-2019 YUKI "Piro" Hiroshi
 *
 */

var i18n = {
  updateString(string) {
    let re = new RegExp(this.keyPrefix + "(.+?)__", "g");
    return string.replace(re, (matched) => {
      const key = matched.slice(this.keyPrefix.length, -2);
      let rv = this.extension
        ? this.extension.localeData.localizeMessage(key)
        : messenger.i18n.getMessage(key);
      return rv ?? matched;
    });
  },

  updateSubtree(node) {
    const texts = document.evaluate(
      'descendant::text()[contains(self::text(), "' + this.keyPrefix + '")]',
      node,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    for (let i = 0, maxi = texts.snapshotLength; i < maxi; i++) {
      const text = texts.snapshotItem(i);
      if (text.nodeValue.includes(this.keyPrefix))
        text.nodeValue = this.updateString(text.nodeValue);
    }

    const attributes = document.evaluate(
      'descendant::*/attribute::*[contains(., "' + this.keyPrefix + '")]',
      node,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    for (let i = 0, maxi = attributes.snapshotLength; i < maxi; i++) {
      const attribute = attributes.snapshotItem(i);
      if (attribute.value.includes(this.keyPrefix))
        attribute.value = this.updateString(attribute.value);
    }
  },

  updateDocument(options = {}) {
    this.extension = null;
    this.keyPrefix = "__MSG_";
    if (options) {
      if (options.extension) this.extension = options.extension;
      if (options.keyPrefix) this.keyPrefix = options.keyPrefix;
    }
    this.updateSubtree(document);
  },
};
