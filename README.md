# suspicious-email-submitter-tb

A Thunderbird add-on to facilitate forwarding malicious emails to analysts

## What does it do?

It adds a single button (conveniently marked "Analyze") that will take an email or a selection of emails and send those messages to a pre-configured email address for further analysis.  Once configured, it's genuinely a one-click-and-done experience.

## How can I test it out?

 1. Either install from source, or download an XPI from the Releases.
 2. In your Thunderbird profile directory create a file called `malware-reporter.json`. It should look like this:

 ```
 {
     "send-via": "email",
     "send-to": "my_analyst@example.com",
     "send-as": "attachment"
 }
 ```

Once you have that two-step process finished, start Thunderbird.  If you see a piece of email that you want to pass on up your reporting chain, click the new `Report` button at the top of your screen and bang, you're done.

## Is it only email?

For now, although submitting via uploading to a webserver will be coming shortly.