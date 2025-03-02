help_text = '''
Manual Config Retrieval Tool Help Guide

Arguments - 

--connection-script="" / -s=""  : The connection script to use to generate a configuration file.
--output="" / -o=""             : The file to ouput the configuration file to.
--address="" / -a=""            : The address of the device to connect to and retrieve a configuration file.
--username="" / -u=""           : The username of the device to connect to.
--password="" / -p=""           : The password of the device to connect to.
--sslVerify="" / -v=""          : Whether SSL Verification is turned on. This setting is optional and will default to 
                                  on. If you are having trouble connecting to your device, set this to "off".


Example - 

python retrieve-config.py --connection-script="connection-script.js" 
                            --output="C:\Files\manual-config.json" --address="https://192.168.0.1:443" 
                            --username="user" --password="password" --sslVerify="off"

For further help, visit https://www.titania.com/support/
'''