function translateURL(url, anchor) {
    if (typeof (anchor) == 'undefined') anchor = '';

    // Skip translation if a absolute path is given.
    let rv = url.startsWith("/")
      ? null
      : browser.i18n.getMessage(url);

    return rv
        ? rv + anchor
        : url + anchor;
  }
