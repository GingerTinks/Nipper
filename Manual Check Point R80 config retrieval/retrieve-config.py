from classes.program import get_config, parse_args
import sys

if __name__ == "__main__":
    """
    Program entry point
    """
    missing_args = parse_args(sys.argv)

    if not missing_args:
        get_config()
    else:
        print('Missing arguments - see the following for help.')
        with open('./help.txt', 'r') as help_file:
            print(help_file.read())


