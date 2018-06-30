# suspicious-email-submitter-tb

A Thunderbird add-on to facilitate forwarding malicious emails to analysts.

## What does it do?

It adds a single button (conveniently marked "Report") that will take an email or a selection of emails and send those messages to a pre-configured email address for further analysis.  Once configured, it's genuinely a one-click-and-done experience.

## How can I test it out?

 * Download the latest [source](https://github.com/rjhansen/suspicious-email-submitter-tb/archive/master.zip) and uncompress it to a directory of your choice
 * Open a terminal window and change to that directory
 * Run `python3 ./make-xpi.py`, which will place `SES-tb.xpi` in your home directory
 * In your Thunderbird profile directory (_not_ the `extensions/` subdirectory, which is beneath it) create a file called `ses-tb.json`. It should look like this. (At this time, all all serverURLs must be `mailto:`s.  HTTPS submission is under development.)
 ```
 {
     "serverURL": "mailto:my_analyst@example.com",
     "authToken": "my_analyst@example.com",
     "name": "your organization name",
     "logo": "your organization logo"
 }
 ```
 * Start Thunderbird
 * Install the `.xpi` file found in your home directory
 * Restart Thunderbird
 * In `Preferences->Toolbar Layout`, click and drag the "Report to SES" button where you like in your Thunderbird toolbar

Once you have this process finished -- honestly, it's easier than it sounds -- if you see a piece of email that you want to pass on up your reporting chain, click the new `Report to SES` button and bang, you're done.

## Is it only email?

For now, although submitting via uploading to a webserver will be coming shortly.