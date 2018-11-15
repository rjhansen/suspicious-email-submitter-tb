function updateUI() {
    let authField = document.getElementById("authToken");
    let via = document.getElementById("via");
    if (via.selectedIndex == 0) {
        authField.value = "";
        authField.setAttribute("disabled", "disabled");
    }
    else {
        authField.removeAttribute("disabled");
    }
}

/* The only thing onLoad does is see whether the window was invoked
 * with parameters to pre-populate the fields.  If so, populate; 
 * if not, display highly visible dummy information.
 */
function onLoad() {
    let params = window.arguments[0];
    let config = ((typeof params == "object") && params.input) ? 
        params.input : {
            name: "Unspecified",
            serverUrl: "mailto:unknown@example.com",
            authToken: ""
        };
    let nameField = document.getElementById("name");
    let serverField = document.getElementById("serverUrl");
    let authField = document.getElementById("authToken");
    let via = document.getElementById("via");

    nameField.value = config.name;
    authField.value = config.authToken;
    
    if (config.serverUrl.substring(0, 7) == "mailto:") {
        via.selectedIndex = 0;
        serverField.value = config.serverUrl.substring(7);
        authField.setAttribute("disabled", "disabled");
        authField.value = "";
    } else {
        via.selectedIndex = 1;
        serverField.value = config.serverUrl.substring(8);
        authField.removeAttribute("disabled");
    }
}

function onAccept() {
    let via = document.getElementById("via");
    let nameField = document.getElementById("name");
    let serverField = document.getElementById("serverUrl");
    let authField = document.getElementById("authToken");
    let params = {
        "name": nameField.value ? nameField.value : "",
        "serverUrl": serverField.value ? serverField.value : "",
        "authToken": authField.value ? authField.value : ""
    };

    let sv = serverField.value;
    if (via.selectedIndex == 0) {
        params["serverUrl"] = "mailto:" + sv;
    } else {
        params["serverUrl"] = "https://" + sv;
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
            serverField.value = "mailto:unknown@example.com";
            authField.value = "Unspecified";
            updateUI();
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

            if (params.serverUrl.substring(0, 7) == "mailto:") {
                document.getElementById("via").selectedIndex = 0;
                params.serverUrl = params.serverUrl.substring(7);
                authField.setAttribute("disabled", "disabled");
            } else {
                document.getElementById("via").selectedIndex = 1;
                params.serverUrl = params.serverUrl.substring(8);
                authField.removeAttribute("disabled");
            }

            nameField.value = (params && params.name) ? 
                params.name : "Unspecified";
            serverField.value = (params && params.serverUrl) ?
                params.serverUrl : "mailto:unknown@example.com";
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
