# Expression Search / GMailUI-NG

Expression Search is a Thunderbird add-on that provides powerful message searching like Gmail's.

For example: type `from:fred to:tom` or `f:fred t:tom` to see all messages from Fred to Tom in the current view. Supports 'regular expressions' and 'click to search'. The full documentation can be found in the help file, accessible by clicking the search icon in the status bar and selecting "Help".

This is a fork with updates for Thunderbird v78-102. You can report issues [on GitHub](https://github.com/opto/expression-search-NG/issues).

### Previous versions

The original Addon by Opera Wang can be installed from AMO for up to TB 60:
https://addons.thunderbird.net/en-US/thunderbird/addon/gmailui/

Documentation for the last version by Opera Wang can be found at:
https://cdn.rawgit.com/wangvisual/expression-search/master/content/help.html

Documentation for the original version (0.1~0.6) can be found at:
http://sites.google.com/site/kmixter/gmailui

### Thanks

* Ken Mixter - original author of GMailUI.
* Opera Wang - 15 years of developing Expression Search/GmailUI.
* savo_msu - author of [One Click Search](https://addons.thunderbird.net/af/thunderbird/addon/one-click-search/).
* Kent James - author of [FiltaQuilla](https://addons.thunderbird.net/en-US/thunderbird/addon/filtaquilla/).
* Jiten Dedhia - suggested `toonly` search.
* Jonathan Kamens - patch for TB56 support.
* Greg Cowan - suggested `date` search.
* Mike Martinez - suggested `bcc` search.
* Olivier - suggested Shift/Ctrl + Enter.
* Paul Sednaoui - suggested `only` search.
* Randolf Ebelt - found a bug with searches using complicated expressions.
* Olivier Brodeur - found a bug where, when no messages found, gloda launched on Ctrl + Enter.
* Lee Yeoh - found a bug where pinned quick search buttons did not work.
* Tom Zhu - suggested Enter should focus message pane, and validations before release.
