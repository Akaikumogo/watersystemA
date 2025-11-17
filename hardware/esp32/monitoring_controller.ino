#include <WiFi.h>
#include <PubSubClient.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>
#include <PZEM004Tv30.h>
#include <NewPing.h>

// ------------------------ Wi-Fi va MQTT ------------------------
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASS";
const char* mqttServer = "BROKER_IP";
const int mqttPort = 1883;
const char* mqttUser = "USERNAME";  // agar kerak bo'lsa
const char* mqttPass = "PASSWORD";  // agar kerak bo'lsa

WiFiClient espClient;
PubSubClient client(espClient);

// ------------------------ TFT ------------------------
#define TFT_CS 5
#define TFT_RST 4
#define TFT_DC 22
Adafruit_ST7735 tft = Adafruit_ST7735(TFT_CS, TFT_DC, TFT_RST);

// ------------------------ Sensorlar ------------------------
#define TRIG_PIN 26
#define ECHO_PIN 27
#define MAX_DISTANCE 400
NewPing sonar(TRIG_PIN, ECHO_PIN, MAX_DISTANCE);

#define FLOW_PIN 25
volatile int pulseCount = 0;
void IRAM_ATTR pulseCounter() { pulseCount++; }

#define MOTOR1_PIN 2
#define MOTOR2_PIN 12

bool activeMotor2 = false;
bool motorFault = false;
String motorState = "OFF";
bool motorNew = false;

unsigned long motorStartDelay = 10000;
unsigned long motorStartTime = 0;
float minCurrent = 0.05;
float maxCurrent = 10.0;
bool motorStarted = false;

PZEM004Tv30 pzem(Serial2, 16, 17);

// ------------------------ Timer ------------------------
unsigned long timerEndTime = 0;
bool timerActive = false;
unsigned long timerDuration = 0;

// ------------------------ O'zgaruvchilar ------------------------
int waterDepth = 0;
int height = 0;
float totalLitres = 0;
float totalElectricity = 0;

// ------------------------ Language ------------------------
String currentLanguage = "uz";  // Default: O'zbek tili
String languageTopic = "device/" + String(deviceName) + "/language/command";

// ------------------------ TFT Display Variables (for optimization) ------------------------
String prevWaterDepth = "";
String prevHeight = "";
String prevTotalLitres = "";
String prevMotorState = "";
String prevTotalElectricity = "";
String prevTimerDisplay = "";
unsigned long lastTFTTime = 0;
const unsigned long tftInterval = 1000;  // 1 second

// ------------------------ Device Info ------------------------
// IMPORTANT: Set this to match your device name in the backend!
const char* deviceName = "ESP32Controller";
const char* deviceLocation = "Remote node";

// ------------------------ MQTT Topics (with device ID) ------------------------
// Build topics with device name: device/{deviceName}/...
String sensorTopic = "device/" + String(deviceName) + "/sensor/data";
String motorTopic = "device/" + String(deviceName) + "/motor/command";
String timerTopic = "device/" + String(deviceName) + "/timer/command";
String heightTopic = "device/" + String(deviceName) + "/height/command";
String motorSwitchTopic = "device/" + String(deviceName) + "/motor/switch";
String statusTopic = "device/" + String(deviceName) + "/status";

// Also subscribe to global topics for backward compatibility
const char* globalSensorTopic = "sensor/data";
const char* globalStatusTopic = "device/status";

// ------------------------ Setup ------------------------
void setup() {
  Serial.begin(115200);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(MOTOR1_PIN, OUTPUT);
  pinMode(MOTOR2_PIN, OUTPUT);
  digitalWrite(MOTOR1_PIN, LOW);
  digitalWrite(MOTOR2_PIN, LOW);
  attachInterrupt(digitalPinToInterrupt(FLOW_PIN), pulseCounter, FALLING);

  tft.initR(INITR_BLACKTAB);
  tft.setRotation(1);
  tft.fillScreen(ST77XX_BLACK);
  tft.setTextColor(ST77XX_WHITE);
  tft.setTextSize(2);
  tft.setCursor(0, 0);
  tft.println("System starting...");

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("Connected!");

  client.setServer(mqttServer, mqttPort);
  client.setCallback(mqttCallback);

  Serial2.begin(9600, SERIAL_8N1, 16, 17);

  // Wait for MQTT connection before publishing
  // publishStatus will be called in loop() after connection
}

// ------------------------ MQTT Callback ------------------------
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (int i = 0; i < length; i++) msg += (char)payload[i];
  
  String topicStr = String(topic);
  
  // Check device-specific topics first
  if (topicStr == motorTopic || topicStr.endsWith("/motor/command")) {
    if (msg == "ON") {
      motorNew = true;
      timerActive = false;  // Manual command - disable timer
    } else if (msg == "OFF") {
      motorNew = false;
      timerActive = false;  // Manual command - disable timer
    }
  } else if (topicStr == timerTopic || topicStr.endsWith("/timer/command")) {
    int timerSeconds = msg.toInt();  // Backend sends in seconds
    timerDuration = timerSeconds * 1000;  // Store in milliseconds
    timerEndTime = millis() + timerDuration;
    timerActive = true;
    motorNew = true;
  } else if (topicStr == heightTopic || topicStr.endsWith("/height/command")) {
    height = msg.toInt();
  } else if (topicStr == motorSwitchTopic || topicStr.endsWith("/motor/switch")) {
    // Switch motor: "1" = motor1, "2" = motor2
    if (msg == "2") {
      activeMotor2 = true;
    } else if (msg == "1") {
      activeMotor2 = false;
    }
  } else if (topicStr == languageTopic || topicStr.endsWith("/language/command")) {
    // Language command: "uz", "en", or "ru"
    if (msg == "uz" || msg == "en" || msg == "ru") {
      currentLanguage = msg;
      Serial.print("Language changed to: ");
      Serial.println(currentLanguage);
    }
  }
  // Backward compatibility: also check global topics
  else if (topicStr == "motor/command") {
    if (msg == "ON") {
      motorNew = true;
      timerActive = false;
    } else if (msg == "OFF") {
      motorNew = false;
      timerActive = false;
    }
  } else if (topicStr == "timer/command") {
    int timerSeconds = msg.toInt();
    timerDuration = timerSeconds * 1000;
    timerEndTime = millis() + timerDuration;
    timerActive = true;
    motorNew = true;
  } else if (topicStr == "height/command") {
    height = msg.toInt();
  } else if (topicStr == "motor/switch") {
    if (msg == "2") {
      activeMotor2 = true;
    } else if (msg == "1") {
      activeMotor2 = false;
    }
  }
}

// ------------------------ Reconnect ------------------------
void reconnect() {
  while (!client.connected()) {
    Serial.print("Connecting MQTT...");
    if (client.connect("ESP32Client", mqttUser, mqttPass)) {
      Serial.println("Connected");
      
      // Subscribe to device-specific topics
      client.subscribe(motorTopic.c_str());
      client.subscribe(timerTopic.c_str());
      client.subscribe(heightTopic.c_str());
      client.subscribe(motorSwitchTopic.c_str());
      client.subscribe(languageTopic.c_str());
      
      // Also subscribe to global topics for backward compatibility
      client.subscribe(globalSensorTopic);
      client.subscribe(globalStatusTopic);
      
      Serial.print("Subscribed to device topics for: ");
      Serial.println(deviceName);
    } else {
      Serial.print("Failed, rc=");
      Serial.print(client.state());
      delay(2000);
    }
  }
}

// ------------------------ Sensor va Motor ------------------------
void updateSensors() {
  int measuredDepth = sonar.ping_cm();
  if (measuredDepth > 0) waterDepth = measuredDepth;

  float flowRate = (pulseCount / 7.5);
  totalLitres += flowRate / 60.0;
  pulseCount = 0;

  float powerWatts = pzem.power();
  float currentVal = pzem.current();
  if (!isnan(powerWatts))
    totalElectricity = round((powerWatts / 1000.0) * 100.0) / 100.0;

  // Motor control logic
  if (timerActive) {
    motorNew = true;
  }

  // Motor state logic: manual command OR height-based auto
  if ((motorNew || (height > 0 && height > waterDepth)) && !motorFault) {
    motorState = "ON";
  } else {
    motorState = "OFF";
  }

  // Motor control with current monitoring
  if (motorState == "ON" && !motorFault) {
    if (!motorStarted) {
      motorStarted = true;
      motorStartTime = millis();  // Record start time
      // Start motor
      if (activeMotor2) {
        digitalWrite(MOTOR2_PIN, HIGH);
        digitalWrite(MOTOR1_PIN, LOW);
      } else {
        digitalWrite(MOTOR1_PIN, HIGH);
        digitalWrite(MOTOR2_PIN, LOW);
      }
    } else {
      // Check current after delay
      if (millis() - motorStartTime >= motorStartDelay) {
        if (!isnan(currentVal) && (currentVal < minCurrent || currentVal > maxCurrent)) {
          // Motor fault detected
          digitalWrite(MOTOR1_PIN, LOW);
          digitalWrite(MOTOR2_PIN, LOW);
          if (activeMotor2) {
            motorFault = true;  // Both motors failed
            motorState = "OFF";
          } else {
            activeMotor2 = true;  // Switch to motor 2
            motorStarted = false;
          }
        }
      }
    }
  } else {
    digitalWrite(MOTOR1_PIN, LOW);
    digitalWrite(MOTOR2_PIN, LOW);
    motorStarted = false;
  }
}

// ------------------------ MQTT Publish ------------------------
void publishData() {
  String payload = "{";
  payload += "\"deviceName\":\"" + String(deviceName) + "\",";
  payload += "\"location\":\"" + String(deviceLocation) + "\",";
  payload += "\"waterDepth\":" + String(waterDepth) + ",";
  payload += "\"height\":" + String(height) + ",";
  payload += "\"totalLitres\":" + String(totalLitres, 2) + ",";
  payload += "\"totalElectricity\":" + String(totalElectricity, 2) + ",";
  payload += "\"motorState\":\"" + motorState + "\",";
  payload += "\"timerActive\":" + String(timerActive ? "true" : "false");
  if (timerActive) {
    unsigned long remaining = (timerEndTime > millis()) ? ((timerEndTime - millis()) / 1000) : 0;
    payload += ",\"timerDuration\":" + String(remaining);
  }
  payload += "}";
  
  // Publish to device-specific topic
  client.publish(sensorTopic.c_str(), payload.c_str());
  
  // Also publish to global topic for backward compatibility
  client.publish(globalSensorTopic, payload.c_str());
}

void publishStatus(String s) {
  // Publish to device-specific topic
  client.publish(statusTopic.c_str(), s.c_str());
  
  // Also publish to global topic for backward compatibility
  client.publish(globalStatusTopic, s.c_str());
}

// ------------------------ Loop ------------------------
void loop() {
  if (!client.connected()) {
    reconnect();
  } else {
    // Only publish status after first connection
    static bool firstConnection = true;
    if (firstConnection) {
      publishStatus("online");
      firstConnection = false;
    }
  }
  
  client.loop();

  updateSensors();
  publishData();
  
  // Update TFT display every 1 second
  unsigned long now = millis();
  if (now - lastTFTTime >= tftInterval) {
    lastTFTTime = now;
    runTFTDisplay();
  }
  
  // Publish status every 30 seconds to keep device online
  static unsigned long lastStatusTime = 0;
  if (millis() - lastStatusTime >= 30000) {
    publishStatus("online");
    lastStatusTime = millis();
  }

  if (timerActive && millis() >= timerEndTime) {
    timerActive = false;
    motorNew = false;
    motorState = "OFF";
  }

  delay(1000);
}

// ------------------------ Multi-language Text Functions ------------------------
String getText(String key) {
  if (currentLanguage == "uz") {
    if (key == "water") return "Suv: ";
    if (key == "height") return "H: ";
    if (key == "usage") return "Sarf: ";
    if (key == "energy") return "En: ";
    if (key == "motor") return "Motor: ";
    if (key == "timer") return "Timer: ";
    if (key == "cm") return " cm";
    if (key == "L") return " L";
    if (key == "kW") return " kW";
  } else if (currentLanguage == "en") {
    if (key == "water") return "Water: ";
    if (key == "height") return "H: ";
    if (key == "usage") return "Usage: ";
    if (key == "energy") return "En: ";
    if (key == "motor") return "Motor: ";
    if (key == "timer") return "Timer: ";
    if (key == "cm") return " cm";
    if (key == "L") return " L";
    if (key == "kW") return " kW";
  } else if (currentLanguage == "ru") {
    if (key == "water") return "Вода: ";
    if (key == "height") return "В: ";
    if (key == "usage") return "Расход: ";
    if (key == "energy") return "Эн: ";
    if (key == "motor") return "Мотор: ";
    if (key == "timer") return "Таймер: ";
    if (key == "cm") return " см";
    if (key == "L") return " л";
    if (key == "kW") return " кВт";
  }
  return key;
}

// ------------------------ TFT Display Function ------------------------
void runTFTDisplay() {
  // 1) Water Depth
  String depthStr = String(waterDepth) + getText("cm");
  if (depthStr != prevWaterDepth) {
    tft.setCursor(0, 0 * 20);
    tft.fillRect(0, 0 * 20, 160, 20, ST77XX_BLACK);
    tft.print(getText("water"));
    tft.println(depthStr);
    prevWaterDepth = depthStr;
  }

  // 2) Height
  String heightStr = String(height) + getText("cm");
  if (heightStr != prevHeight) {
    tft.setCursor(0, 1 * 20);
    tft.fillRect(0, 1 * 20, 160, 20, ST77XX_BLACK);
    tft.print(getText("height"));
    tft.println(heightStr);
    prevHeight = heightStr;
  }

  // 3) Total Litres
  String litresStr = String(totalLitres, 2) + getText("L");
  if (litresStr != prevTotalLitres) {
    tft.setCursor(0, 2 * 20);
    tft.fillRect(0, 2 * 20, 160, 20, ST77XX_BLACK);
    tft.print(getText("usage"));
    tft.println(litresStr);
    prevTotalLitres = litresStr;
  }

  // 4) Electricity
  String powerStr = String(totalElectricity, 2) + getText("kW");
  if (powerStr != prevTotalElectricity) {
    tft.setCursor(0, 3 * 20);
    tft.fillRect(0, 3 * 20, 160, 20, ST77XX_BLACK);
    tft.print(getText("energy"));
    tft.println(powerStr);
    prevTotalElectricity = powerStr;
  }

  // 5) Motor State
  if (motorState != prevMotorState) {
    tft.setCursor(0, 4 * 20);
    tft.fillRect(0, 4 * 20, 160, 20, ST77XX_BLACK);
    tft.print(getText("motor"));
    tft.println(motorState);
    prevMotorState = motorState;
  }

  // 6) Timer (mm:ss format)
  unsigned long now = millis();
  unsigned long remSec = 0;
  if (timerActive && now < timerEndTime) {
    remSec = (timerEndTime - now) / 1000;
  } else {
    remSec = 0;
  }
  unsigned long minutes = remSec / 60;
  unsigned long seconds = remSec % 60;
  char buf[6];
  sprintf(buf, "%02lu:%02lu", minutes, seconds);
  String timerStr = String(buf);
  if (timerStr != prevTimerDisplay) {
    tft.setCursor(0, 5 * 20);
    tft.fillRect(0, 5 * 20, 160, 20, ST77XX_BLACK);
    tft.print(getText("timer"));
    tft.println(timerStr);
    prevTimerDisplay = timerStr;
  }
}


