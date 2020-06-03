function main() {
    // These error codes can be found in Json Error Handler
    var authenticationError = 0;
    var connectionFailedError = 1;
    connectionFailed = false;

    progressFeedback.updateCurrentProgress("Connecting...", 20);
    progressFeedback.updateCurrentProgress("Logging in...", 20);

    login();

    if (response.getStatusCode() != 200) {
        if (connectionFailed) {
            errorHandler.setErrorType(connectionFailedError);
        } else {
            errorHandler.setErrorType(authenticationError);
        }

        errorHandler.setErrorCode(response.getStatusCode());
        errorHandler.setNetworkResponse(response.getBody());
        return errorHandler.getError();
    }

    progressFeedback.updateCurrentProgress("Retrieving Configuration...", 40);

    /* Standard domain */
    var config = [
        retrieveLoginMessage(),
        retrieveFilteringRules(),
        retrieveNatRulebase(),
        retrieveServices(),
        retrieveNetworkObjects(),
        retrieveIpsSettings(),
        retrieveVPN()
    ];

    logout();

    /* System Data domain */
    config.push(retrieveAdminUsers());

    progressFeedback.updateCurrentProgress("Finished retrieving from device", 80);

    return JSON.stringify(config, null, 2);
}

function login() {
    doLogin("");
}

function loginToDomain(domainString) {
    doLogin(domainString);
}

function doLogin(domainString) {
    var urlAppend = "/web_api/login";

    var loginBodyObject = {
        user: "",
        password: "",
        "domain": domainString
    }

    loginBodyObject.user = connectionDetails.getUser();
    loginBodyObject.password = connectionDetails.getLoginPassword();

    request.setRequestType("POST");
    request.setURL(deviceUrl + urlAppend);
    request.setBody(JSON.stringify(loginBodyObject));
    request.setHeader("Content-Type", "application/json");

    connection.sendRequest(request, response);

    try {
        var jsonBody = JSON.parse(response.getBody());
        request.setHeader("X-chkp-sid", jsonBody.sid);
    } catch (e) {
        connectionFailed = true;
	}
}

function logout() {
    var urlAppend = "/web_api/logout";

    request.setRequestType("POST");
    request.setURL(deviceUrl + urlAppend);
    request.setBody("{}");

    connection.sendRequest(request, response);
}

function retrieveLoginMessage() {
    var configPart = {
        "titania-command-id": "login message",
        "request-response": [] 
    }

    var urlAppend = "/web_api/show-login-message";

    request.setRequestType("POST");
    request.setURL(deviceUrl + urlAppend);
    request.setBody("{}")

    connection.sendRequest(request, response);

    var requestResponseString = jsonRequestResponseWriter.writeJson("show-login-message", request, response);
    var requestResponseObject = JSON.parse(requestResponseString);
    configPart["request-response"].push(requestResponseObject);
    return configPart;
}

function retrieveAdminUsers() {
    loginToDomain("System Data");

    if (response.getStatusCode() != 200) {
        return;
    }

    var configPart = {
        "titania-command-id": "show administrators",
        "request-response": [] 
    }

    var urlAppend = "/web_api/show-administrators";

    request.setRequestType("POST");
    request.setURL(deviceUrl + urlAppend);
    request.setBody("{}")

    connection.sendRequest(request, response);
    var requestResponseString = jsonRequestResponseWriter.writeJson("show-administrators", request, response);
    var requestResponseObject = JSON.parse(requestResponseString);
    configPart["request-response"].push(requestResponseObject);

    logout();

    return configPart;
}

function retrieveFilteringRules() {
    var configPart = {
        "titania-command-id": "filtering rules",
        "request-response": []
    }
    // get all access layers
    var accessLayersRequestResponses = retrieveObjects("show-access-layers", "standard");
    var accessLayerNames = getAccessLayerNames(accessLayersRequestResponses);

    // get access rulebase for each layer
    var accessRulebaseRequestResponses = []
    var i = 0;
    while(i < accessLayerNames.length)
    {
        accessRulebaseRequestResponses = accessRulebaseRequestResponses.concat(retrieveAccessRulebase(accessLayerNames[i]));
        i++;
    }

    // get the gateways and servers to extract which access policies are installed
    accessLayersRequestResponses = accessLayersRequestResponses.concat(retrieveObjects("show-gateways-and-servers", "full"));

    configPart["request-response"] = accessLayersRequestResponses.concat(accessRulebaseRequestResponses)
    return configPart;
}

function retrieveNatRulebase() {
    var configPart = {
        "titania-command-id": "nat rules",
        "request-response": []
    }

    var showNatRulebaseBody = {
      "offset" : 0,
      "limit" : 500,
      "details-level" : "full",
      "use-object-dictionary" : "true",
      "package" : "standard"
    }

    request.setRequestType("POST");
    request.setURL(deviceUrl + "/web_api/show-nat-rulebase");
    request.setBody(JSON.stringify(showNatRulebaseBody));

    var requestResponses = sendRequestUntilRetrievedAllItems("show-nat-rulebase", request, response)
    configPart["request-response"] = requestResponses;
    return configPart;
}

function retrieveIpsSettings() {
    var configPart = {
        "titania-command-id": "show simple gateway",
        "request-response": [] 
    }

    var urlAppend = "/web_api/show-simple-gateways";
    var body = {
        "details-level" : "full"
	}

    request.setRequestType("POST");
    request.setURL(deviceUrl + urlAppend);
    request.setBody(JSON.stringify(body));
    connection.sendRequest(request, response);

    var gatewaysJson = JSON.parse(response.getBody());
    var gatewaysObjects = gatewaysJson.objects;
    for(var i = 0; i < gatewaysObjects.length; i++) {
        if(request.getURL().indexOf(gatewaysObjects[i]["ipv4-address"]) !== -1) {
            var gatewayName = gatewaysObjects[i].name;

            var urlAppend = "/web_api/show-simple-gateway";
            var body = {
                "name" : gatewayName
	        }

            request.setRequestType("POST");
            request.setURL(deviceUrl + urlAppend);
            request.setBody(JSON.stringify(body));

            connection.sendRequest(request, response);
            var commandJson = jsonRequestResponseWriter.writeJson("show-simple-gateway", request, response);
            configPart["request-response"].push(JSON.parse(commandJson));
            return configPart;
        }
    }

    return configPart;
}

function getAccessLayerNames(requestResponses) {
    var listOfLayerNames = [];
    var i = 0;
    while(i < requestResponses.length)
    {
        var accessLayerList = requestResponses[i].response.body["access-layers"];
        var j = 0;
        while(j < accessLayerList.length)
        {
            listOfLayerNames.push(accessLayerList[j].name);
            j++;
        }
        i++
    }
    return listOfLayerNames;
}

function retrieveAccessRulebase(layerName) {
    var showAccessRulebaseBody = {
        "offset" : 0,
        "limit" : 500,
        "name" : layerName,
        "details-level" : "standard",
        "use-object-dictionary" : true
    }
    request.setRequestType("POST");
    request.setURL(deviceUrl + "/web_api/show-access-rulebase");
    request.setBody(JSON.stringify(showAccessRulebaseBody));
    
    var requestResponses = sendRequestUntilRetrievedAllItems("show-access-rulebase", request, response);
    return requestResponses;
}

function retrieveServices() {
    var configPart = {
        "titania-command-id": "services",
        "request-response": []
    }

    var commands = [
        "show-services-tcp",
        "show-services-udp",
        "show-services-icmp",
        "show-services-icmp6",
        "show-services-sctp",
        "show-services-dce-rpc",
        "show-services-rpc"
	]

    var index = 0;
    for(index; index < commands.length; index++) {
        configPart["request-response"] = configPart["request-response"].concat(retrieveObjects(commands[index], "full"));
	}

    //Service groups
    configPart["request-response"] = configPart["request-response"].concat(retrieveEachServiceGroup());
    
    return configPart;
}

function retrieveEachServiceGroup(){

    var serviceGroups = retrieveObjects("show-service-groups", "standard");

    var serviceGroupCommand = "show-service-group";
    request.setRequestType("POST");
    request.setURL(deviceUrl + "/web_api/" + serviceGroupCommand);
    var eachGroup = [];

    for(var i = 0; i < serviceGroups.length; i++) {
        
        var objectList = serviceGroups[i].response.body["objects"];

        for(var j = 0; j < objectList.length; j++) {
            
            var uid = objectList[j].uid;
            var serviceGroupBody = {
                "uid" : uid
            }
            serviceGroupBody["uid"] = uid;
            request.setBody(JSON.stringify(serviceGroupBody));

            connection.sendRequest(request, response);

            var requestResponseString = jsonRequestResponseWriter.writeJson(serviceGroupCommand, request, response);
            eachGroup.push(JSON.parse(requestResponseString));
		}
	}
    
    return eachGroup;
}


function retrieveNetworkObjects() {
    var configPart = {
        "titania-command-id": "network objects",
        "request-response": []
    }

    // get responses and concatenate them together
    var requestResponses = retrieveObjects("show-hosts", "standard");
    requestResponses = requestResponses.concat(retrieveObjects("show-networks", "standard"));
    requestResponses = requestResponses.concat(retrieveObjects("show-address-ranges", "standard"));
    requestResponses = requestResponses.concat(retrieveObjects("show-multicast-address-ranges", "standard"));
    requestResponses = requestResponses.concat(retrieveObjects("show-gateways-and-servers", "full"));
    requestResponses = requestResponses.concat(retrieveObjects("show-security-zones", "standard"));
    requestResponses = requestResponses.concat(retrieveObjects("show-dynamic-objects", "standard"));

    //get groups 
    var showGroupsRequestResponses = retrieveObjects("show-groups", "standard");
    requestResponses = requestResponses.concat(showGroupsRequestResponses);

    //parse group names and get details for each group
    for(var index = 0; index < showGroupsRequestResponses.length; index++) {
        var groupList = showGroupsRequestResponses[index].response.body.objects;
        for(var groupIndex = 0; groupIndex < groupList.length; groupIndex++)
        {
            var groupName = groupList[groupIndex].name;
            requestResponses.push(retrieveGroup(groupName));
        }
    }

    // append concatenated
    configPart["request-response"] = requestResponses;
    return configPart;
}

function retrieveNetworkObjectCommand(commandString, detailsLevelString) {
    var showCommandBody = {
        "offset" : 0,
        "limit" : 500,
        "details-level" : detailsLevelString
    }

    request.setRequestType("POST");
    request.setURL(deviceUrl + "/web_api/show-" + commandString);
    request.setBody(JSON.stringify(showCommandBody));
    var requestResponses = sendRequestUntilRetrievedAllItems("show-" + commandString,
                                                             request, response);
    return requestResponses;
}

function retrieveGroup(groupNameString) {
    var showGroupBody = {
        "name": groupNameString,
        "details-level": "standard"
    }
    request.setRequestType("POST");
    request.setURL(deviceUrl + "/web_api/show-group");
    request.setBody(JSON.stringify(showGroupBody));
    connection.sendRequest(request, response);
    var requestResponseString = jsonRequestResponseWriter.writeJson("show-group", request, response);
    requestResponse = JSON.parse(requestResponseString);
    return requestResponse;
}

function retrieveVPN() {
    var configPart = {
        "titania-command-id": "VPN",
        "request-response": []
    };
    // run commands to get site2site vpn community uid's 
    var s2sVpnUids = [];
    s2sVpnUids = s2sVpnUids.concat(retrieveObjects("show-vpn-communities-star", "uid"));
    s2sVpnUids = s2sVpnUids.concat(retrieveObjects("show-vpn-communities-meshed", "uid"));

    var s2sVpnRequestResponses = []
    // run show-generic-object for each of these uid's
    for(var i = 0; i < s2sVpnUids.length; i++)
    {
       var s2sVpnObjects = s2sVpnUids[i].response.body.objects;
       for(var j = 0; j < s2sVpnObjects.length; j++) {
          s2sVpnRequestResponses = s2sVpnRequestResponses.concat(retrieveGenericObject(s2sVpnObjects[j]));
       } 
    }   
    configPart["request-response"] = configPart["request-response"].concat(s2sVpnRequestResponses);
    
    //run show-generic-objects with name 'RemoteAccess'
    var remoteAccessRequestResponse = retrieveRemoteAccessVpnDetails();
    configPart["request-response"].push(remoteAccessRequestResponse);

    var dhGroupUids = [];
    
    // parse DH group uid's from s2s VPN's
    for(var i = 0; i < s2sVpnRequestResponses.length; i++) {
        dhGroupUids.push(s2sVpnRequestResponses[i].response.body.ikeP1.ikeP1DhGrp);
        dhGroupUids.push(s2sVpnRequestResponses[i].response.body.ikeP2.ikeP2PfsDhGrp);
    }

    // parse DH group uid's from the 'RemoteAccess' 
    if(remoteAccessRequestResponse.response.body.objects.length > 0) {
        var remoteAccessVpnGenericObject = remoteAccessRequestResponse.response.body.objects[0];
        dhGroupUids.push(remoteAccessVpnGenericObject.ikeP1.ikeP1DhGrp);
        dhGroupUids.push(remoteAccessVpnGenericObject.ikeP2.ikeP2PfsDhGrp);
    }

    var uniqueDhGroupUids = [];
    for(var i = 0; i < dhGroupUids.length; i++) {
        if(uniqueDhGroupUids.indexOf(dhGroupUids[i]) == -1) {
            uniqueDhGroupUids.push(dhGroupUids[i]);
        }
    }

    // run show-generic-objects for each of the DH groups
    for(var i = 0; i < uniqueDhGroupUids.length; i++) {
        configPart["request-response"].push(retrieveGenericObject(uniqueDhGroupUids[i]));   
    }

    //retrieve gateway names 
    configPart["request-response"] = configPart["request-response"].concat(retrieveObjects("show-simple-gateways", "standard"));
    
    return configPart;
}

function retrieveGenericObject(uidString) {
    var showCommandBody = {
        "uid" : uidString,
        "details-level" : "full"
    }
    request.setRequestType("POST");
    request.setURL(deviceUrl + "/web_api/show-generic-object");
    request.setBody(JSON.stringify(showCommandBody));
    connection.sendRequest(request, response);
    return JSON.parse(jsonRequestResponseWriter.writeJson("show-generic-object", request, response));
}

function retrieveRemoteAccessVpnDetails() {
    var showCommandBody = {
        "name" : "RemoteAccess",
        "details-level" : "full"
    }
    request.setRequestType("POST");
    request.setURL(deviceUrl + "/web_api/show-generic-objects");
    request.setBody(JSON.stringify(showCommandBody));
    connection.sendRequest(request, response);
    return JSON.parse(jsonRequestResponseWriter.writeJson("show-generic-objects", request, response));
}

/**
 * @brief Runs Check Point API commands which for which the response is expected to be a list of objects
 * 
 * @note Will retrieve up to 500 objects in a single API request (the max allowed by the Check Point API) but will 
 *          make as many requests as necessary to retrieve all the items
 * 
 * @param commandString - The command to be ran, eg 'show-groups', 'show-networks'
 * 
 * @param detailsLevelString - Sets the 'details-level' parameter in the API request;
 *                                  the Check Point API recognises the values 'uid', 'standard', 'full'
 * 
 * @returns list of request-response objects for each time the specified command was run
 */
function retrieveObjects(commandString, detailsLevelString) {
    var showCommandBody = {
        "offset" : 0,
        "limit" : 500,
        "details-level" : detailsLevelString
    }

    request.setRequestType("POST");
    request.setURL(deviceUrl + "/web_api/" + commandString);
    request.setBody(JSON.stringify(showCommandBody));
    return sendRequestUntilRetrievedAllItems(commandString, request, response);
}

/** 
 * @brief Runs the same command until all items are retrieved
 *
 * @note Utility function for working with Check Point R80 API commands which retrieve 
 *          a list of items where a single request might not return the complete list
 *
 * @note Takes the request and runs connection.sendRequest multiple times incrementing the 
 *          'limit' parameter in the request body until all the objects have been retrieved
 * 
 * @note The sub-set of items that are retrieved in a single API call is controlled by the parameters 'limit' and 
 *              'response' in the request body.
 *              The meaning of these parameters is: return [limit] items skipping the first [offset] items
 *              The relationship between the received sub-set in a single call and the total list 
 *              can be read from the parameters 'from', 'to' and 'total'  in the response body.
 *              The meaning of these parameters is: returned items [from] to [to] of a total of [total] items
 * 
 * @param commandString - The name of the command being run, needed for writing comman-response json 
 * 
 * @param request - The HTTP request for the API command to be run. 
 * 
 * @param response - The HTTP response returned by the API commmand.
 * 
 * @returns Array of the request-response objects for each time the command was run
 *
*/
function sendRequestUntilRetrievedAllItems(commandString, request, response)
{    
    function retrievedAllItems(response)
    {
        var responseBodyObject = JSON.parse(response.getBody());
        return (responseBodyObject.total === 0 || responseBodyObject.to === responseBodyObject.total)
    }

    var requestResponseList = [];
    var retrievedAll = false;
    while (!retrievedAll) {
        connection.sendRequest(request, response);
        var requestResponseString = jsonRequestResponseWriter.writeJson(commandString, request, response);
        requestResponseList.push(JSON.parse(requestResponseString));

        var requestBodyObject = JSON.parse(request.getBody());
        requestBodyObject.offset += requestBodyObject.limit;
        request.setBody(JSON.stringify(requestBodyObject));

        retrievedAll = retrievedAllItems(response)
    } 

    return requestResponseList;
}
