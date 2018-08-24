function onLoad() {
    let params = window.arguments[0];
    let config = null;

    if (params) {
        config = params["input"];
    }

    if (config && config.name && config.serverUrl && config.authToken) {
        document.getElementById("name").value = config.name;
        document.getElementById("serverUrl").value = config.serverUrl;
        document.getElementById("authToken").value = config.authToken;
    } else {
        document.getElementById("name").value = "Unspecified";
        document.getElementById("serverUrl").value = "Unspecified";
        document.getElementById("authToken").value = "Unspecified";
    }
}

function onAccept() {
    let configFile = Components.classes['@mozilla.org/file/directory_service;1']
        .getService(Components.interfaces.nsIProperties)
        .get("ProfD", Components.interfaces.nsIFile);
    configFile.append("ses-tb.json");

    let params = {
        "name": document.getElementById("name").value,
        "serverUrl": document.getElementById("serverUrl").value,
        "authToken": document.getElementById("authToken").value
    };

    let paramString = JSON.stringify(params);
    
    let foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
        createInstance(Components.interfaces.nsIFileOutputStream);
    foStream.init(configFile, 0x02 | 0x08 | 0x20, 0666, 0);

    let converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].
        createInstance(Components.interfaces.nsIConverterOutputStream);
    converter.init(foStream, "UTF-8", 0, 0);
    converter.writeString(paramString);
    converter.close();

    return true;
}

function loadFile() {
    const nsIFilePicker = Components.interfaces.nsIFilePicker;
    let pickerFactory = Components.classes["@mozilla.org/filepicker;1"];
    let picker = pickerFactory.createInstance(nsIFilePicker);
    let rv = null;
	picker.init(window, "Choose SES config file", nsIFilePicker.modeOpen);
    picker.appendFilter("JSON files", "*.json");
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
            let thread = Components.classes["@mozilla.org/thread-manager;1"]
                                   .getService().currentThread;
            while (!done) {
              thread.processNextEvent(true);
            }
            return rv2;
        }
        rv = PickerShow(picker);
    }

	if (rv == nsIFilePicker.returnOK) {
        let file = picker.file;
        if (file.exists() && file.isReadable()) {
            let str = {};
            let bytesRead = 0;
            let data = "";
            let fstream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                .createInstance(Components.interfaces.nsIFileInputStream);
            let cstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
                .createInstance(Components.interfaces.nsIConverterInputStream);
            fstream.init(file, -1, 0, 0);
            cstream.init(fstream, "UTF-8", 0, 0);

            do { 
                bytesRead = cstream.readString(0xffffffff, str);
                data += str.value;
            } while (bytesRead != 0);
            cstream.close();
            
            let params = JSON.parse(data);

            if (params && params.name && params.serverUrl && params.authToken) {
                document.getElementById("name").value = params.name;
                document.getElementById("serverUrl").value = params.serverUrl;
                document.getElementById("authToken").value = params.authToken;
            } else {
                document.getElementById("name").value = "Corrupt file";
                document.getElementById("serverUrl").value = "Corrupt file";
                document.getElementById("authToken").value = "Corrupt file";
            }
        }
    }
}
