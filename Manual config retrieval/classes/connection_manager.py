import requests, urllib3, json, base64
"""This disables warnings when running with the sslVerify option off"""
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

    def getHeader(self, header):
        return self.header.get(header, '')

    def get_header(self):
        return self.header

    def get_type(self):
        return self.type

class Response:
    """Holds data for requests response"""

    def __init__(self):
        self.statusCode = 0
        self.body = {}
        self.headers = {}

    def getStatusCode(self):
        return self.statusCode

    def getBody(self):
        return json.dumps(self.body)

    def getHeader(self, header):
        return self.headers.get(header, '')

    def getReasonPhrase(self):
        return "204"

    def set_body(self, body):
        self.body = body

    def set_status_code(self, code):
        self.statusCode = code

    def get_header(self):
        return ''

    def set_headers(self, headers):
        self.headers = headers

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
            request_body = request.getBody()
            if request_body:
                req = requests.post(request.getURL(), json=json.loads(request_body), headers=request.get_header(), verify=self.sslVerify)
            else:
                req = requests.post(request.getURL(), headers=request.get_header(), verify=self.sslVerify)
            
            try:
                response.set_body(req.json())
            except:
                response.set_body(req.text)

            response.set_status_code(req.status_code)
            response.set_headers(req.headers)
        except Exception as e:
            print(f'Exception sending post request: {e}')
            response.set_body('Unable to send request to device at {}'.format(request.getURL()))

    def __get_request(self, request, response):
        try:
            req = requests.get(request.getURL(), headers=request.get_header(), verify=self.sslVerify)

            try:
                response.set_body(req.json())
            except:
                response.set_body(req.text)
            
            response.set_status_code(req.status_code)
            response.set_headers(req.headers)
        except Exception as e:
            print(f'Exception sending get request: {e}')
            response.set_body('Unable to send request to device at {}'.format(request.getURL()))


class JsonRequestResponseWriter:
    """Writes json data to the required format"""

    def writeJson(self, command, request, response):
        request_body = json.loads(request.getBody()) if request.getBody() else {}
        req_res = {
            "request":{
                "body": request_body,
                "command": command
            },
            "response":{
                "body": json.loads(response.getBody())
            }
        }

        return json.dumps(req_res)


class ProgressFeedback:
    """Used to update user on retrieval progress"""

    def updateCurrentProgress(self, message, percentage):
        print(f'{percentage}% {message}')


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

class Utility:
    """Handles converting strings to base64"""
    def toBase64(self, string):
        return base64.b64encode(str.encode(string)).decode('utf-8')