#!/bin/bash

# MQTT Test Script
# Bu skript MQTT broker bilan aloqa va topic'larni test qilish uchun

MQTT_HOST="185.217.131.96"
MQTT_PORT="1883"
MQTT_USER="tr12345678"
MQTT_PASS="tr12345678"
DEVICE_NAME="qaysiddurboshcka"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== MQTT Test Script ===${NC}\n"

# Test 1: MQTT Broker Connection
echo -e "${YELLOW}Test 1: MQTT Broker Connection${NC}"
if mosquitto_sub -h "$MQTT_HOST" -p "$MQTT_PORT" -u "$MQTT_USER" -P "$MQTT_PASS" -t "test" -C 1 -W 2 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ MQTT Broker is accessible${NC}\n"
else
    echo -e "${RED}✗ MQTT Broker is not accessible${NC}\n"
    exit 1
fi

# Test 2: Subscribe to Sensor Data
echo -e "${YELLOW}Test 2: Subscribe to Sensor Data Topic${NC}"
echo "Listening for sensor data on: device/$DEVICE_NAME/sensor/data"
echo "Press Ctrl+C to stop..."
echo ""
mosquitto_sub -h "$MQTT_HOST" -p "$MQTT_PORT" -u "$MQTT_USER" -P "$MQTT_PASS" \
    -t "device/$DEVICE_NAME/sensor/data" -v
