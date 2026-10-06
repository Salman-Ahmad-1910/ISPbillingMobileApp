#!/bin/bash
# Run this once after connecting your device: ./scripts/setup-device.sh
ADB="/home/salman-ahmad/Android/Sdk/platform-tools/adb"

echo "Waiting for device..."
$ADB wait-for-device

echo "Setting up port forwarding..."
$ADB reverse tcp:8081 tcp:8081
$ADB reverse tcp:8090 tcp:8090

echo "Done! Ports 8081 (Metro) and 8090 (API) are forwarded."
$ADB reverse --list
