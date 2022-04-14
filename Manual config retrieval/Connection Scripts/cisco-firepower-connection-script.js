var accessToken;

function main() {
    progressFeedback.updateCurrentProgress("Initiating FirePOWER connection...", 1);
    if (!login()) {
        return response.getReasonPhrase();
    }

    var deviceRecords = getDeviceRecords();
    var deviceUUIDs = parseNameIdList(deviceRecords);

    var config = {
        "config-retrieval-method": "Titania Connection - Cisco FirePOWER",
        "devicerecords": [deviceRecords],
        "devices": getDeviceSections(deviceUUIDs),
        "serverversion": [getServerVersion()],
    };

    progressFeedback.updateCurrentProgress("Configuration retrieval complete!", 95);
    if (!logout()) {
        return response.getReasonPhrase();
    }

    return JSON.stringify(config, null, 2);
}

function login() {
    progressFeedback.updateCurrentProgress("Logging in...", 5);
    initialURL = request.getURL();
    var urlAppend = "/api/fmc_platform/v1/auth/generatetoken";
    request.setRequestType("POST");
    request.setURL(initialURL + urlAppend);

    request.setHeader("Authorization", authenticateUser(connectionDetails.getUser(), connectionDetails.getLoginPassword()));
    connection.sendRequest(request, response);

    accessToken = response.getHeader("X-auth-access-token");
    request.setHeader("X-auth-access-token", accessToken);

    domainID = response.getHeader("DOMAIN_UUID");
    request.setHeader("DOMAIN_UUID", domainID);
    request.setURL(initialURL);

    if (response.getStatusCode() != 204 || (response.getReasonPhrase() != "204" && response.getBody() != "")) {
        progressFeedback.updateCurrentProgress("Error!\nCode: " + response.getStatusCode() + "\nPhrase: " + response.getReasonPhrase(), 90);
        return false;
    }

    progressFeedback.updateCurrentProgress("Log in complete!", 10);
    return true;
}

function authenticateUser(user, password) {
    var token = user + ":" + password;
    var hash = utility.toBase64(token);
    return "Basic " + hash;
}

function logout() {
    progressFeedback.updateCurrentProgress("Logging out...", 98);
    var logoutUrl = "/api/fmc_platform/v1/auth/revokeaccess";
    request.setRequestType("POST");
    initialURL = request.getURL();
    request.setURL(initialURL + logoutUrl);

    request.setHeader("X-auth-access-token", accessToken);
    connection.sendRequest(request, response);

    if (response.getStatusCode() != 204 || (response.getReasonPhrase() != "204" && response.getBody() != "")) {
        progressFeedback.updateCurrentProgress("Error!\nCode: " + response.getStatusCode() + "\nPhrase: " + response.getReasonPhrase(), 100);
        return false;
    }

    request.setURL(initialURL);

    progressFeedback.updateCurrentProgress("Log out complete!", 100);
    return true;
}

function getConfigSection(command, params) {
    var response = runCommand(command, params);
    return JSON.parse(response);
}

function runCommand(commandString, params) {
    request.setRequestType("GET");
    var initalURL = request.getURL();
    var url = initalURL + commandString;
    url = addParam(url, "offset=0", true);
    url = addParam(url, "limit=500", false);
    url = addParam(url, "expanded=true", false);

	if (params) {
		for (var i = 0; i < params.length; ++i) {
			url = addParam(url, params[i], false);
		}
	}

    request.setURL(url);
    connection.sendRequest(request, response);

    var requestResponseString = jsonRequestResponseWriter.writeJson(url, request, response);
    request.setURL(initalURL);
    return requestResponseString;
}

function runOperationalCommand(containerUUID, command, parameters) {
    // The command filter query parameter should have value of show commands. The maximum word size of this field is 2. Separate by '%20'.
    // The parameters filter query parameter should have values containing command values exceeding word size of 2 should be given as part of parameters field.
    var url = "/api/fmc_config/v1/domain/" + request.getHeader("DOMAIN_UUID") + "/devices/devicerecords/" + containerUUID + "/operational/commands";
    var params = [
        "command=" + command,
        "parameters=" + parameters
    ];
    return getConfigSection(url, params);
}

function addParam(url, param, first) {
    if (first) {
        url += "?";
    }
    else {
        url += "&";
    }
    url += param;
    return url;
}

function parseNameIdList(requestResponse) {
    // Returns an object of {"name": "UUID", "name2": "UUID2"}
    var items = requestResponse["response"]["body"]["items"];
    var returnList = {};
	if(items) {
		for (var i = 0; i < items.length; ++i) {
			var item = items[i];
			returnList[item["name"]] = item["id"];
		}
	}
    return returnList;
}

function getDeviceSections(devices) {
    var deviceConfig = {};
    progressFeedback.updateCurrentProgress("Retrieving device sections", 30);
    for (var device in devices) {
        var deviceUUID = devices[device];
        var deviceSections = {
            "runningconfig": [getRunningConfig(deviceUUID)]
        };

        deviceConfig[deviceUUID] = deviceSections;
    }
    progressFeedback.updateCurrentProgress("Device sections retrieved!", 80);
    return deviceConfig;
}

function getDeviceRecords() {
    var command = "/api/fmc_config/v1/domain/" + request.getHeader("DOMAIN_UUID") + "/devices/devicerecords";
    progressFeedback.updateCurrentProgress("Retrieving device records", 15);
    return getConfigSection(command, []);
}

function getServerVersion() {
    var command = "/api/fmc_platform/v1/info/serverversion";
    progressFeedback.updateCurrentProgress("Retrieving server version", 85);
    return getConfigSection(command, []);
}

function getRunningConfig(deviceUUID) {
    return runOperationalCommand(deviceUUID, "show%20running-config", "all", "runningconfig");
}
