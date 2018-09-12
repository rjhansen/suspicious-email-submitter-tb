/* 
 * Copyright (C) 2018, Rob Hansen.
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

var SES = {
	count: 0, // count of emails sent this session
	config: null, // extension-wide configuration options
		
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
			SES.alertService.showAlertNotification(null, 
				title, text, false, '', null);
		} catch(e) {
			Cu.reportError(e);
		}
	},

	editConfig: function() {
		let configFile = SES.dirService.get("ProfD", Ci.nsIFile);
		configFile.append("ses-tb.json");

		SES.config = null;

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

			SES.config = JSON.parse(data);
		}

		window.openDialog("chrome://ses/content/configWindow.xul",
			"SES Configuration", "chrome,dialog,modal,resizable=yes",
			{"input": SES.config}).focus();
	},
	
	// Loads the configuration file ("ses-tb.json") from disk.
	// This file *MUST* be UTF-8, in proper JSON format, and comply
	// to a specific format (see the docs).  This code tries to do
	// smart things in the face of bad input, but it's not perfect.
	// Far from it, in fact.
	//
	// Parameters: null
	// Returns: null
	// Side effects: populates SES.config
	// Errors: leaves SES.config as null
	// Exceptions: will not throw, leaves SES.config as null
	loadConfig: function() {
		let configFile = SES.dirService.get("ProfD", Ci.nsIFile);
		configFile.append("ses-tb.json");
		SES.config = null;

		if (! (configFile.exists() && configFile.isReadable())) {
			window.openDialog("chrome://ses/content/configWindow.xul",
			"SES Configuration", "chrome,dialog,modal,resizable=yes",
			null).focus();
		}

		if (! (configFile.exists() && configFile.isReadable())) {
			return;
		}

		let str = {};
		let bytesRead = 0;
		let data = "";
		let fstream = Cc["@mozilla.org/network/file-input-stream;1"]
			.createInstance(Ci.nsIFileInputStream);
		let cstream = Cc["@mozilla.org/intl/converter-input-stream;1"]
			.createInstance(Ci.nsIConverterInputStream);

		try {
			fstream.init(configFile, -1, 0, 0);
			cstream.init(fstream, "UTF-8", 0, 0);

			do { 
				bytesRead = cstream.readString(0xffffffff, str);
				data += str.value;
			} while (bytesRead != 0);
			cstream.close();

			SES.config = JSON.parse(data);
			if (SES.config && (null != SES.config.serverUrl) &&
			(null != SES.config.authToken) &&
			(null != SES.config.name) &&
			(SES.config.serverUrl.match(/^mailto:.*$/) ||
			SES.config.serverUrl.match(/^https:\/\/.$/))) {
				return;
			}
			SES.config = null;
		}
		catch (ex) {
			SES.config = null;
		}

		SES.config = (data == "") ? null : JSON.parse(data);
	},

	// called on startup.  A no-op.
	//
	// Parameters: none
	// Returns: null
	// Side effects: None
	// Errors: None
	// Exceptions: will not throw
	startup: function() {
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
		let composeService = Cc['@mozilla.org/messengercompose;1']
<<<<<<< HEAD
			.getService(Ci.nsIMsgComposeService);
=======
		    .getService(Ci.nsIMsgComposeService);
>>>>>>> 52473a0520766bc48901afa1b9e6d6fb73daffff
		let msgs = gFolderDisplay.selectedMessages;
		let count = gFolderDisplay.selectedCount;
		let mailserver = gFolderDisplay.displayedFolder.server;
		let confirm = " of mail to\n" + dest + "\nfor inspection"
		let asAttachment = composeService.kForwardAsAttachment;

		try {
			for (let i = 0 ; i < count ; i += 1) {
				composeService.forwardMessage(dest,
					msgs[i],
					null, // do not open a compose window
					mailserver,
					asAttachment);
			}

			SES.count += count;
			confirm += "\n(" + SES.count + " total sent this session)"

			if (1 == count) {
				SES.notify("Suspicious Email Submitter",
					"Sent one piece" + confirm);
			} else {
				SES.notify("Suspicious Email Submitter",
					"Sent " + count + " pieces" + confirm);
			}
		} catch (error) {
			SES.notify("Suspicious Email Submitter", "Error: " + error);
		}
	},

	// Initiates an XMLHttpRequest to a MISP instance and sends one message.
	//
	// Parameters: a complete email message
	// Returns: none
	// Side effects: causes network traffic to be sent
	// Errors: none
	// Exceptions: does not throw errors
	completeWebRequest: function(msg) {
		try {
			req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
		} 
		catch (ex) {
			req = new XMLHttpRequest();
			mustClose = true;
		}

		// For right now, calls are done synchronously.  We need to
		// walk before we run...
		
		req.open("POST", SES.config.serverUrl, false);
		req.setRequestHeader("Accept", "application/json");
		req.setRequestHeader("Content-Type", "application/json");
		req.setRequestHeader("Authorization", SES.config.authToken);
		
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
			SES.notify("Suspicious Email Submitter error",
				"Server returned status " + req.status);
			return false;
		}
		return true;
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
		if (0 == count) {
			return;
		}

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
				sis.available();
				while (sis.available()) {
					content += sis.read(1024);
				}
				sis.close();
			} catch (ex) {
				SES.notify("Suspicious Email Submitter error", "error: " + ex);
			}
			if (SES.completeWebRequest(content)) {
				SES.count += 1;
			}
		}
		SES.notify("Suspicious Email Submitter", 
			"Submitted an email to " + SES.config["serverUrl"] +
			"\n(" + SES.count + " total sent this session)");
	},

	// invoked when the client hits the magic button.  At present it
	// only handles emailed reports, but it does that reasonably well.
	// Work is underway to handle HTTPS submissions.
	//
	// Parameters: none
	// Returns: null
	// Side effects: causes data to be either queued for sending later,
	//               or immediately sent, depending on the user's
	//               Thunderbird preferences.  Will also load the
	//               config file anew each time.
	// Errors: may report errors to the user, but not propagated back
	//         through code
	// Exceptions: will not throw
	report: function() {
		if (0 == gFolderDisplay.selectedCount) {
			return;
		}

		SES.loadConfig();

		if (null == SES.config) {
			return;
		}

		if (SES.config["serverUrl"].match(/^mailto:.*$/)) {
			SES.reportViaEmail();
		} else if (SES.config["serverUrl"].match(/^https:\/\/.*$/)) {
			SES.reportViaHTTPS();
		}
	}
}

window.addEventListener("load", SES.startup, false);
