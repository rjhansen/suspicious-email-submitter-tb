# suspicious-email-submitter-thunderbird

A Thunderbird add-on to facilitate forwarding malicious emails to analysts via the Suspicious Email Submission process.

## What does it do?

### Globally

In the global menubar there will be an entry, “SES”, with two child items: “Edit configuration” which allows you to view and edit the current configuration, and “About Suspicious Email Submitter”, which will take you to SES’s home on the web.

### Toolbars

Both the 3-pane view toolbar and the single-message-view toolbar have a button added labeled “Report via Suspicious Email Submitter”.  Once SES is configured, this button will send the email off to whatever MISP upstream has been set up.

### Context menu

In the mail context menu there’s a “Report via Suspicious Email Submitter” entry.

## How can I test it out?

You will need [Python 3.5 or later](https://www.python.org/downloads/) to build from source.

 * Download the latest [source](https://github.com/rjhansen/suspicious-email-submitter-tb/archive/master.zip) and uncompress it to a directory of your choice
 * Open a terminal window and change to that directory
 * Run `python3 ./make-xpi.py`, which will place `ses-tb.xpi` in your home directory
 * Start Thunderbird
 * Install the `.xpi` file found in your home directory
 * Restart Thunderbird
 * In `Preferences->Toolbar Layout` (`View->Toolbars->Customize` on macOS), click and drag the “Report via Suspicious Email Submitter” button where you like in your Thunderbird toolbar

## Is it only email?

Both `mailto:` and `https://` handlers exist, but only `mailto:` has had significant testing. `https://` is a work in progress.
