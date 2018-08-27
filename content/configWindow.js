/* The only thing onLoad does is see whether the window was invoked
 * with parameters to pre-populate the fields.  If so, populate; 
 * if not, display "Unspecified".  This function is robust in the
 * face of even pathologically malformed inputs.
 */
function onLoad() {
    let params = window.arguments[0];
    let config = ((typeof params == "object") && params.input) ? 
        params.input : {};
    let nameField = document.getElementById("name");
    let serverField = document.getElementById("serverUrl");
    let authField = document.getElementById("authToken");

    nameField.value = (typeof config.name) == "string" ? 
        config.name : "Unspecified";
    serverField.value = (typeof config.serverUrl) == "string" ? 
        config.serverUrl : "Unspecified";
    authField.value = (typeof config.authToken) == "string" ? 
        config.authToken : "Unspecified";
}


/* onAccept() checks to see if the serverUrl field is populated
 * with either a mailto: or https:// URL.  Assuming so, it does
 * no sanity checking on the other inputs and writes the fields
 * to disk straightaway.  Yes, this means we put no bounds on the
 * length of the fields. */
function onAccept() {
    let nameField = document.getElementById("name");
    let serverField = document.getElementById("serverUrl");
    let authField = document.getElementById("authToken");
    let params = {
        "name": nameField.value ? nameField.value : "",
        "serverUrl": serverField.value ? serverField.value : "",
        "authToken": authField.value ? authField.value : ""
    };

    let mailtoMatch = params.serverUrl.match(/^mailto:.*$/);
    let httpsMatch = params.serverUrl.match(/^https:\/\/.*$/);
    if (! (mailtoMatch || httpsMatch)) {
        // the server URL is clearly bogus: abort.
        return false;
    }

    try {
        const dirsvc = "@mozilla.org/file/directory_service;1";
        let configFile = Components.classes[dirsvc]
            .getService(Components.interfaces.nsIProperties)
            .get("ProfD", Components.interfaces.nsIFile);
        let paramString = JSON.stringify(params);
        let fosStr = "@mozilla.org/network/file-output-stream;1";
        let cosStr = "@mozilla.org/intl/converter-output-stream;1";
        let CiFile = Components.interfaces.nsIFileOutputStream;
        let CiCon = Components.interfaces.nsIConverterOutputStream;
        let foStream = Components.classes[fosStr].createInstance(CiFile);
        let converter = Components.classes[cosStr].createInstance(CiCon);

        configFile.append("ses-tb.json");
        foStream.init(configFile, 0x02 | 0x08 | 0x20, 0666, 0);
        converter.init(foStream, "UTF-8", 0, 0);

        converter.writeString(paramString);
        converter.close();

        return true;
    }
    catch (ex) {
        // On exceptions, refuse to close -- this isn't an ideal
        // solution, but at least it lets the user know something's
        // amiss.  Look into ways to use notifications from within
        // modal dialogs.
        return false;
    }
}

/* Attempts to load a configuration file from disk.  It's reasonably
 * robust in the face of pathological inputs ... reasonably.
 */
function loadFile() {
    let nsIFilePicker = Components.interfaces.nsIFilePicker;
    let nsIFIS = Components.interfaces.nsIFileInputStream;
    let nsICIS = Components.interfaces.nsIConverterInputStream;
    let pFstr = "@mozilla.org/filepicker;1";
    let fis = "@mozilla.org/network/file-input-stream;1";
    let cis = "@mozilla.org/intl/converter-input-stream;1";
    let tmgr = "@mozilla.org/thread-manager;1";
    let modeOpen = nsIFilePicker.modeOpen;
    let pickerFactory = Components.classes[pFstr];
    let picker = pickerFactory.createInstance(nsIFilePicker);
    let nameField = document.getElementById("name");
    let serverField = document.getElementById("serverUrl");
    let authField = document.getElementById("authToken");
    let rv = null;

	picker.init(window, "Choose SES config file", modeOpen);
    picker.appendFilter("JSON files", "*.json");

    // Pre-TB 60: picker.show() works normally.
    // Post-TB 60: the PickerShow() function is necessary to achieve
    //             the same result.
    try {
        rv = picker.show();
    }
    catch (ex) {
        let PickerShow = function(fp) {
            let done = false;
            let rv2, result;
            fp.open(result => {
                rv2 = result;
                done = true;
            });
            let thread = Components.classes[tmgr].getService().currentThread;
            while (!done) {
              thread.processNextEvent(true);
            }
            return rv2;
        }
        rv = PickerShow(picker);
    }

	if (rv == nsIFilePicker.returnOK) {
        let file = picker.file;
        if (! (file.exists() && file.isReadable())) {
            // The file was, for whatever reason, unreadable.  Don't even
            // try to recover: just populate with unspecifieds and bail out.
            nameField.value = "Unspecified";
            serverField.value = "Unspecified";
            authField.value = "Unspecified";
            return;
        }

        let str = {};
        let bytesRead = 0;
        let data = "";
        try {
            let fstream = Components.classes[fis].createInstance(nsIFIS);
            let cstream = Components.classes[cis].createInstance(nsICIS);
            fstream.init(file, -1, 0, 0);
            cstream.init(fstream, "UTF-8", 0, 0);

            do { 
                bytesRead = cstream.readString(0xffffffff, str);
                data += str.value;
            } while (bytesRead != 0);
            cstream.close();
        
            let params = JSON.parse(data);
            nameField.value = (params && params.name) ? 
                params.name : "Unspecified";
            serverField.value = (params && params.serverUrl) ?
                params.serverUrl : "Unspecified";
            authField.value = (params && params.authToken) ?
                params.authToken : "Unspecified";
        }
        catch (ex) {
            // Unfortunately, TB doesn't have a good way to notify
            // from within modal dialogs -- not that I've found yet.
            nameField.value = "Unspecified";
            serverField.value = "Unspecified";
            authField.value = "Unspecified";
        }
    }
    // If the user canceled out of the file picker, do *NOT* overwrite
    // the current contents of the fields.
}
