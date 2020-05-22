import js2py
from js2py import EvalJs as Eval
from classes.connection_manager import (Request, Response, ConnectionDetails, HTTPRequest, 
                                        JsonRequestResponseWriter, ProgressFeedback, ErrorHandler)

con_script = ''
output = ''
username = ''
password = ''
address = ''
ssl_verify = True

def get_config():
    """
    Responsible for executing connection script and writing the recieved
    configuration file to the file specified
    """
    global con_script
    global output
    global username
    global password
    global address
    global ssl_verify

    device_url = address
    request = Request()
    response = Response()

    connection_details = ConnectionDetails()
    connection_details.username = username
    connection_details.password = password

    connection = HTTPRequest(ssl_verify)

    json_request_response_writer = JsonRequestResponseWriter()
    progress_feedback = ProgressFeedback()
    error_handler = ErrorHandler()

    js_file = ''

    try:
        with open(con_script) as file:
            js_file = file.read()
    except:
        print("Unable to open connection script at {}".format(con_script))
        return

    context = Eval({'deviceUrl': device_url, 'request': request, 'response': response, 'connectionDetails': connection_details, 
                    'connection': connection, 'jsonRequestResponseWriter': json_request_response_writer, 'progressFeedback': progress_feedback, 
                    'errorHandler': error_handler})
    context.execute(js_file)
    config = context.main()

    if config:
        with open(output, 'w') as output:
            output.write(config)
    else:
        print("No configuration file generated.")


def parse_args(argv):
    """
    Handles the argument parsing when the script is run
    """
    con_script_arg = '--connection-script='
    con_script_arg_short = '-s='

    out_arg = '--output='
    out_arg_short = '-o='

    user_arg = '--username='
    user_arg_short = '-u='

    password_arg = '--password='
    password_arg_short = '-p='

    address_arg = '--address='
    address_arg_short = '-a='

    ssl_verify_arg = '--sslVerify='
    ssl_verify_arg_short = '-v='

    global con_script
    global output
    global username
    global password
    global address
    global ssl_verify

    for arg in argv:
        if con_script_arg in arg:
            con_script = arg.replace(con_script_arg, '')
        elif con_script_arg_short in arg:
            con_script = arg.replace(con_script_arg_short, '')
        elif out_arg in arg:
            output = arg.replace(out_arg, '')
        elif out_arg_short in arg:
            output = arg.replace(out_arg_short, '')
        elif user_arg in arg:
            username = arg.replace(user_arg, '')
        elif user_arg_short in arg:
            username = arg.replace(user_arg_short, '')
        elif password_arg in arg:
            password = arg.replace(password_arg, '')
        elif password_arg_short in arg:
            password = arg.replace(password_arg_short, '')
        elif address_arg in arg:
            address = arg.replace(address_arg, '')
        elif address_arg_short in arg:
            address = arg.replace(address_arg_short, '')
        elif ssl_verify_arg in arg:
            ssl = arg.replace(ssl_verify_arg, '')
            ssl_verify = is_argument_on(ssl)
        elif ssl_verify_arg_short in arg:
            ssl = arg.replace(ssl_verify_arg_short, '')
            ssl_verify = is_argument_on(ssl)

    arg_list = [con_script, output, username, password, address]
    missing_args = False

    for detail in arg_list:
        if not detail:
            missing_args = True

    return missing_args


def is_argument_on(arg):
    """
    Returns a boolean for whether the argument is on
    """
    arg = arg.lower()
    if "true" in arg or 'on' in arg or 'yes' in arg:
        return True
    else:
        return False