import requests
import urllib3
import json
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class Request:
    """Holds data for making requests"""

    def __init__(self):
        self.type = ''
        self.url = ''
        self.body = {}
        self.header = {}

    def setRequestType(self, type):
        self.type = type

    def setURL(self, url):
        self.url = url
    
    def setBody(self, body):
        self.body = body

    def setHeader(self, header, value):
        self.header[header] = value

    def getURL(self):
        return self.url

    def getBody(self):
        return self.body

    def get_header(self):
        return self.header

    def get_type(self):
        return self.type

class Response:
    """Holds data for requests response"""

    def __init__(self):
        self.statusCode = 0
        self.body = {}

    def getStatusCode(self):
        return self.statusCode

    def getBody(self):
        return json.dumps(self.body)

    def set_body(self, body):
        self.body = body

    def set_status_code(self, code):
        self.statusCode = code

    def get_header(self):
        return ''

class ConnectionDetails:
    """Holds details required to make requests"""

    def __init__(self):
        self.username = ''
        self.password = ''

    def getUser(self):
        return self.username

    def getLoginPassword(self):
        return self.password


class HTTPRequest:
    """Makes HTTP requests with the details provided"""

    def __init__(self, sslVerify):
        self.sslVerify = sslVerify
    
    def sendRequest(self, request, response):
        if 'POST' in request.get_type():
            self.__post_request(request, response)
        elif 'GET' in request.get_type():
            self.__get_request(request, response)

    def __post_request(self, request, response):
        try:
            req = requests.post(request.getURL(), json=json.loads(request.getBody()), headers=request.get_header(), verify=self.sslVerify)
            response.set_body(req.json())
            response.set_status_code(req.status_code)
        except:
            response.set_body('Unable to send request to device at {}'.format(request.getURL()))

    def __get_request(self, request, response):
        try:
            req = requests.get(request.getURL())
            response.set_body(req.json())
            response.set_status_code(req.status_code)
        except:
            response.set_body('Unable to send request to device at {}'.format(request.getURL()))


class JsonRequestResponseWriter:
    """Writes json data to the required format"""

    def writeJson(self, command, request, response):
        req_res = {
            "request":{
                "body": json.loads(request.getBody()),
                "command": command,
                "headers": request.get_header(),
            },
            "response":{
                "body": json.loads(response.getBody()),
                "headers": response.get_header()
            }
        }

        return json.dumps(req_res)


class ProgressFeedback:
    """Used to update user on retrieval progress"""

    def updateCurrentProgress(self, message, percentage):
        print(message)


class ErrorHandler:
    """Handles setting and alerting errors"""

    def __init__(self):
        self.error_code = ''
        self.network_response = ''

    def getError(self):
        print("Error {} occured.".format(self.error_code))
        print("Response - {}".format(self.network_response))

    def setErrorType(self, error):
        pass

    def setErrorCode(self, error):
        self.error_code = error

    def setNetworkResponse(self, error):
        self.network_response = error