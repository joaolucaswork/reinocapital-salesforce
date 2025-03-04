#!/bin/bash
# Set custom SFDX config directory for WSL
export SFDX_CONFIG_DIR=~/.sfdx-wsl

# Function to open URLs in Windows default browser
function open_windows_browser() {
    url=$1
    # Convert to Windows path and open in PowerShell
    powershell.exe -Command "Start-Process '${url}'"
}

# Check if we're doing a web login that needs browser
if [[ "$*" == *"auth:web:login"* ]] || [[ "$*" == *"force:auth:web:login"* ]] || [[ "$*" == *"org:login:web"* ]]; then
    # Handle new SF CLI format
    if [[ "$*" == *"org:login:web"* ]]; then
        url=$(sf org:login:web -r "$@" | grep -o 'https://[^ ]*')
    else
        # Use -r flag to just get URL and open it in Windows browser
        url=$(sfdx "$@" -r | grep -o 'https://[^ ]*')
    fi
    
    if [ ! -z "$url" ]; then
        echo "Opening Salesforce login URL in your default Windows browser..."
        open_windows_browser "$url"
        exit 0
    else
        echo "Could not obtain login URL. Trying alternative authentication method..."
        
        # If you're using the new sf CLI command format
        if [[ "$*" == *"org:login:web"* ]]; then
            echo "Try using: sf org:login:device"
            sf org:login:device
        else
            # For older sfdx CLI command format
            echo "Try using: sfdx auth:device:login"
            sfdx auth:device:login
        fi
        exit 0
    fi
fi

# Otherwise, run the command normally with all arguments
if [[ "$1" == "sf" ]]; then
    # If first argument is sf, run the sf command
    sf "${@:2}"
else
    # Otherwise run sfdx command
    sfdx "$@"
fi