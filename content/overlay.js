/* 
Copyright (C) 2018, Rob Hansen.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

var console = Cc["@mozilla.org/consoleservice;1"]
	.getService(Ci.nsIConsoleService);

var Clouseau = {
	config: null, // extension-wide configuration options

	// The Mozilla message composition service -- the interface for
	// everything related to message composition (including forwarding)
	composeService: Cc['@mozilla.org/messengercompose;1']
		.getService(Ci.nsIMsgComposeService),
	
	// The Mozilla alert service.  On OS X the alert() function isn't
	// reliable, so we use the Mozilla notification system instead.
	alertService: Cc['@mozilla.org/alerts-service;1']
		.getService(Ci.nsIAlertsService),
	

	// The Mozilla directory service, which is used for all file I/O.
	// This is used for parsing the config file.
	dirService: Cc['@mozilla.org/file/directory_service;1']
		.getService(Ci.nsIProperties),

	// A crossplatform replacement for Javascript alert().  I wasted 
	// way too much time thinking my code was working on OS X when it
	// wasn't -- it was just the alert() call was suppressed due to
	// an OS configuration setting.  You may be tempted to use alert()
	// and forget all about this.  *Don't.*
	notify: function(title, text) {
		try {
			Clouseau.alertService.showAlertNotification(null, 
				title, text, false, '', null);
		} catch(e) {
			Cu.reportError(e);
		}
	},
	
	// Loads the configuration file ("clouseau.json") from disk.
	// This file *MUST* be UTF-8, in proper JSON format, and comply
	// to a specific format (see the docs).  This code tries to do
	// smart things in the face of bad input, but it's not perfect.
	// Far from it, in fact.
	//
	// Parameters: none
	// Returns: null
	// Side effects: populates Clouseau.config
	// Errors: leaves Clouseau.config as null
	// Exceptions: will not throw, leaves Clouseau.config as null
	loadConfig: function() {
		try {
			let configFile = Clouseau.dirService.get("ProfD",
				Ci.nsIFile);
			configFile.append("ses-tb.json")

			if (configFile.exists() && configFile.isReadable()) {
				let str = {};
				let bytesRead = 0;
				let data = "";
				let fstream = Cc["@mozilla.org/network/file-input-stream;1"]
					.createInstance(Ci.nsIFileInputStream);
				let cstream = Cc["@mozilla.org/intl/converter-input-stream;1"]
					.createInstance(Ci.nsIConverterInputStream);
				fstream.init(configFile, -1, 0, 0);
				cstream.init(fstream, "UTF-8", 0, 0);

				do { 
					bytesRead = cstream.readString(0xffffffff, str);
					data += str.value;
				} while (bytesRead != 0);
				cstream.close();

				Clouseau.config = JSON.parse(data)
			}
		}
		catch (error) {
			Clouseau.notify("SES error", error);
			Clouseau.config = null;
		}

		if (Clouseau.config && (Clouseau.config.hasOwnProperty("serverUrl") &&
		Clouseau.config.hasOwnProperty("authToken") &&
		Clouseau.config.hasOwnProperty("name") &&
		Clouseau.config.hasOwnProperty("logo"))) {
			document.getElementById("clouseau-button").disabled = false;
		}
		else {
			Clouseau.notify("SES error", 
				"SES is misconfigured. Malware reporting will be unavailable.")
			document.getElementById("clouseau-button").disabled = true;
		}
	},

	// called on startup.  At present, the only thing it does is call
	// loadConfig().
	//
	// Parameters: none
	// Returns: null
	// Side effects: see Clouseau.config
	// Errors: see Clouseau.loadConfig()
	// Exceptions: will not throw
	startup: function() {
		Clouseau.loadConfig();
	},

	// invoked when messages need to be sent off via email.
	//
	// Parameters: none
	// Returns: null
	// Side effects: causes data to be either queued for sending later,
	//               or immediately sent, depending on the user's
	//               Thunderbird preferences
	// Errors: may report errors to the user, but not propagated back
	//         through code
	// Exceptions: will not throw
	reportViaEmail: function() {
		let msgs = gFolderDisplay.selectedMessages;
		let count = gFolderDisplay.selectedCount;
		let mailserver = gFolderDisplay.displayedFolder.server;
		let confirm = " of mail to\n" + dest + "\nfor inspection"
		let asAttachment = Clouseau.composeService.kForwardAsAttachment;

		try {
			for (let i = 0 ; i < count ; i += 1) {
				Clouseau.composeService.forwardMessage(dest,
					msgs[i],
					null, // do not open a compose window
					mailserver,
					asAttachment);
			}
			if (1 == count) {
				Clouseau.notify("SES",
					"Sent one piece" + confirm);
			} else {
				Clouseau.notify("SES",
					"Sent " + count + " pieces" + confirm);
			}
		} catch (error) {
			Clouseau.notify("SES", "Error: " + error);
		}
	},

	completeWebRequest: function(msg) {
		let req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
		// For right now, calls are done synchronously.  We need to
		// walk before we run...
		
		req.open("POST", Clouseau.config["serverUrl"], false);
		req.setRequestHeader("Accept", "application/json");
		req.setRequestHeader("Content-Type", "application/json");
		req.setRequestHeader("Authorization", Clouseau.config["authToken"]);
		
		objects = [
			{
				'name': 'email',
				'meta-category': 'network',
				'description': 'Email object describing an email with meta-information',
				'template_uuid': 'a0c666e0-fc65-4be8-b48f-3423d788b552',
				'template_version': 10,
				'Attribute': [
					{
						'category': 'Payload delivery',
						'type': 'attachment',
						'object_relation': 'eml',
						'value': 'Raw Email',
						'data': msg
					}
				],
			}
		];
		let body = JSON.stringify({
			'Event': {
				'info': 'Suspicious Email Submitter',
				'distribution': 0,
				'threat_level_id': 3,
				'analysis': 1,
				'Object': objects
			}
		});		
		req.send(body);
		if (req.status != "200") {
			Clouseau.notify("SES error", "Server returned status " + 
				req.status);
		} else {
			Clouseau.notify("SES", "Submitted an email to " + Clouseau.config["serverUrl"]);
		}
		req.close();
	},

	// invoked when messages need to be sent off via HTTPS.
	//
	// Parameters: none
	// Returns: null
	// Side effects: creates network traffic
	// Errors: may report errors to the user, but not propagated back
	//         through code
	// Exceptions: will not throw
	reportViaHTTPS: function() {
		let count = gFolderDisplay.selectedCount;
		let idx = 0;
		for (idx = 0 ; idx < count ; idx += 1) {
			let content = ""
			let header = gFolderDisplay.selectedMessages[idx];
			let messenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger);
			let folder = header.folder;
			let uri = folder.getUriForMsg(header);
			let svc = messenger.messageServiceFromURI(uri);
			let stream = Cc["@mozilla.org/network/sync-stream-listener;1"].createInstance();
			let consumer = stream.QueryInterface(Ci.nsIInputStream);
			let si = Cc["@mozilla.org/scriptableinputstream;1"].createInstance();
			let sis = si.QueryInterface(Ci.nsIScriptableInputStream);
			sis.init(consumer);
			try {
				svc.streamMessage(uri, stream, null, null, false, null);
			} catch (ex) {
				Clouseau.notify("SES error", "error: " + ex);
			}

			sis.available();
			while (sis.available()) {
				content += sis.read(1024);
			}

			Clouseau.completeWebRequest(content);
		}
	},

	// invoked when the client hits the magic button.  At present it
	// only handles emailed reports, but it does that reasonably well.
	// Work is underway to handle HTTPS submissions.
	//
	// Parameters: none
	// Returns: null
	// Side effects: causes data to be either queued for sending later,
	//               or immediately sent, depending on the user's
	//               Thunderbird preferences
	// Errors: may report errors to the user, but not propagated back
	//         through code
	// Exceptions: will not throw
	report: function() {
		let count = gFolderDisplay.selectedCount;

		if (0 == count) {
			return;
		}

		if (null == Clouseau.config) {
			// we shouldn't ever get here, but on the off chance something
			// weird happens...
			Clouseau.notify("SES error", 
				"SES is misconfigured. Malware reporting will be unavailable.")
			document.getElementById("clouseau-button").disabled = true;
			return;
		}

		if (Clouseau.config["serverUrl"].match(/^mailto:.*$/)) {
			Clouseau.reportViaEmail();
		} else if (Clouseau.config["serverUrl"].match(/^https:\/\/.*$/)) {
			Clouseau.reportViaHTTPS();
		} else {
			Clouseau.notify("SES error", 
				"SES is misconfigured. Malware reporting will be unavailable.")
			document.getElementById("clouseau-button").disabled = true;
		}
	}
}

window.addEventListener("load", Clouseau.startup, false);