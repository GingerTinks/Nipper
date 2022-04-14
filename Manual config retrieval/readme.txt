Manual Config Retrieval Tool - 


Requirements -

If you are running this script from source, you are required to have installed python, pip and pipenv.
For information about installing these, see the following links - 
https://www.python.org/downloads/
https://pypi.org/project/pip/
https://pypi.org/project/pipenv/

Alternatively if you do not wish to install any additional software, an executable version of this script 
for Windows is available in this repository.
This is located nipper_config_retrieval/Manual config retrieval/Executable
This executable can be run with the same arguments as retrieve-config.py.


Running retrieve-config.py - 

Once all of the requirements have been met, open a command prompt and navigate to the current directory.
Run 'pipenv sync' to download the python modules needed to run.
Once complete, run 'pipenv run python retrieve-config.py' with the relevant arguments, e.g. - 

pipenv run python retrieve-config.py --connection-script="connection-script.js" 
                                --output="C:\Files\manual-config.json" --address="https://192.168.0.1:443" 
                                --username="user" --password="password" --sslVerify="off"

To see a full list of arguments avaliable, run 'pipenv run retrieve-config.py' or open help.txt.
