#!/bin/bash

# MQTT Command Sender Script
# Bu skript ESP32 ga command yuborish uchun

MQTT_HOST="185.217.131.96"
MQTT_PORT="1883"
MQTT_USER="tr12345678"
MQTT_PASS="tr12345678"
DEVICE_NAME="qaysiddurboshcka"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ $# -lt 2 ]; then
    echo "Usage: $0 <command_type> <value>"
    echo ""
    echo "Command types:"
    echo "  motor    - Motor control (ON/OFF)"
    echo "  timer    - Timer in seconds"
    echo "  height   - Height in cm"
    echo "  switch   - Motor switch (1 or 2)"
    echo ""
    echo "Examples:"
    echo "  $0 motor ON"
    echo "  $0 timer 300"
    echo "  $0 height 150"
    echo "  $0 switch 2"
    exit 1
fi

COMMAND_TYPE=$1
VALUE=$2

case $COMMAND_TYPE in
    motor)
        if [ "$VALUE" != "ON" ] && [ "$VALUE" != "OFF" ]; then
            echo "Error: Motor value must be ON or OFF"
            exit 1
        fi
        TOPIC="device/$DEVICE_NAME/motor/command"
        ;;
    timer)
        if ! [[ "$VALUE" =~ ^[0-9]+$ ]]; then
            echo "Error: Timer value must be a number (seconds)"
            exit 1
        fi
        TOPIC="device/$DEVICE_NAME/timer/command"
        ;;
    height)
        if ! [[ "$VALUE" =~ ^[0-9]+$ ]]; then
            echo "Error: Height value must be a number (cm)"
            exit 1
        fi
        TOPIC="device/$DEVICE_NAME/height/command"
        ;;
    switch)
        if [ "$VALUE" != "1" ] && [ "$VALUE" != "2" ]; then
            echo "Error: Switch value must be 1 or 2"
            exit 1
        fi
        TOPIC="device/$DEVICE_NAME/motor/switch"
        ;;
    *)
        echo "Error: Unknown command type: $COMMAND_TYPE"
        exit 1
        ;;
esac

echo -e "${YELLOW}Sending command...${NC}"
echo "Topic: $TOPIC"
echo "Payload: $VALUE"
echo ""

mosquitto_pub -h "$MQTT_HOST" -p "$MQTT_PORT" -u "$MQTT_USER" -P "$MQTT_PASS" \
    -t "$TOPIC" -m "$VALUE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Command sent successfully${NC}"
else
    echo -e "${RED}✗ Failed to send command${NC}"
    exit 1
fi
