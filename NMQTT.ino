#include <WiFi.h>
#include <Preferences.h>
#include <PubSubClient.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>
#include <PZEM004Tv30.h>
#include <NewPing.h>

// ================= WIFI & MQTT =================
const char* ssid = "Abduxalil";
const char* password = "9876543210";

const char* mqttServer = "185.217.131.96";
const int mqttPort = 1883;
const char* mqttUser = "tr12345678";
const char* mqttPass = "tr12345678";

// ================= DEVICE =================
String deviceName = "qaysiddurboshcka";
String deviceTopic;
String settingsRequestTopic;
String settingsResponseTopic;

// ================= SETTINGS =================
bool ultrasonicMode = true; // Ultrasonic auto mode (true = AUTO, false = MANUAL)
bool motorOnline = false; // Motor online/offline status

// ================= MQTT =================
WiFiClient espClient;
PubSubClient client(espClient);

// ================= TFT =================
#define TFT_CS 5
#define TFT_RST 4
#define TFT_DC 22
Adafruit_ST7735 tft(TFT_CS, TFT_DC, TFT_RST);

// ================= SENSOR =================
#define TRIG_PIN 26
#define ECHO_PIN 27
NewPing sonar(TRIG_PIN, ECHO_PIN, 400);

#define FLOW_PIN 25
volatile int pulseCount = 0;
void IRAM_ATTR pulseCounter() { pulseCount++; }

// ================= MOTOR =================
#define MOTOR1_PIN 2
#define MOTOR2_PIN 12

bool activeMotor2 = false;
bool motorFault = false;
bool motorManual = false;
bool motorStarted = false;
String motorState = "OFF";

unsigned long motorStartTime = 0;
const unsigned long motorStartDelay = 10000;
float minCurrent = 0.05;
float maxCurrent = 10.0;

// ================= TIMER =================
bool timerActive = false;
unsigned long timerEndTime = 0;

// ================= MEASURE =================
int waterDepth = 0;
int height = 0;
float totalLitres = 0;
float totalEnergy = 0;

// ================= PZEM =================
PZEM004Tv30 pzem(Serial2, 16, 17);

// ================= TIMERS =================
unsigned long lastSensor = 0;
unsigned long lastPublish = 0;
unsigned long lastDisplayUpdate = 0;

// ================= HELPERS =================
void stopMotors() {
  digitalWrite(MOTOR1_PIN, LOW);
  digitalWrite(MOTOR2_PIN, LOW);
  motorStarted = false;
}

void applyMotor() {
  if (activeMotor2) {
    digitalWrite(MOTOR2_PIN, HIGH);
    digitalWrite(MOTOR1_PIN, LOW);
  } else {
    digitalWrite(MOTOR1_PIN, HIGH);
    digitalWrite(MOTOR2_PIN, LOW);
  }
}

// ================= DISPLAY =================
void updateDisplay() {
  tft.fillScreen(ST7735_BLACK);
  
  tft.setTextColor(ST7735_WHITE);
  tft.setTextSize(1);
  tft.setCursor(0, 0);
  tft.print("Water System");
  
  tft.setCursor(0, 10);
  tft.print(deviceName);
  
  tft.setCursor(0, 25);
  tft.setTextColor(ST7735_CYAN);
  tft.print("Depth: ");
  tft.print(waterDepth);
  tft.print(" cm");
  
  tft.setCursor(0, 40);
  tft.setTextColor(ST7735_YELLOW);
  tft.print("Height: ");
  tft.print(height);
  tft.print(" cm");
  
  tft.setCursor(0, 55);
  if (motorState == "ON") {
    tft.setTextColor(ST7735_GREEN);
  } else {
    tft.setTextColor(ST7735_RED);
  }
  tft.setTextSize(2);
  tft.print("Motor: ");
  tft.print(motorState);
  
  tft.setCursor(0, 75);
  tft.setTextColor(ST7735_WHITE);
  tft.setTextSize(1);
  tft.print("Motor ");
  tft.print(activeMotor2 ? "2" : "1");
  
  // Mode: AUTO/MANUAL based on ultrasonicMode
  tft.setCursor(0, 90);
  tft.setTextColor(ultrasonicMode ? ST7735_GREEN : ST7735_YELLOW);
  tft.print("Mode: ");
  tft.print(ultrasonicMode ? "AUTO" : "MANUAL");
  
  tft.setCursor(0, 105);
  tft.setTextColor(ST7735_BLUE);
  tft.print("Water: ");
  tft.print(totalLitres, 1);
  tft.print(" L");
  
  tft.setCursor(0, 120);
  tft.setTextColor(ST7735_MAGENTA);
  tft.print("Energy: ");
  tft.print(totalEnergy, 2);
  tft.print(" kWh");
  
  tft.setCursor(0, 135);
  tft.setTextColor(WiFi.status() == WL_CONNECTED ? ST7735_GREEN : ST7735_RED);
  tft.print("WiFi: ");
  tft.print(WiFi.status() == WL_CONNECTED ? "OK" : "OFF");
  
  tft.setCursor(0, 150);
  tft.setTextColor(client.connected() ? ST7735_GREEN : ST7735_RED);
  tft.print("MQTT: ");
  tft.print(client.connected() ? "OK" : "OFF");
}

// ================= MQTT PUBLISH (GLOBAL) =================
void publishState(String event) {
  if (!client.connected()) return;

  String payload = "{";
  payload += "\"deviceName\":\"" + deviceName + "\",";
  payload += "\"waterDepth\":" + String(waterDepth) + ",";
  payload += "\"height\":" + String(height) + ",";
  payload += "\"motorState\":\"" + motorState + "\",";
  payload += "\"motorBy\":\"" + event + "\",";
  payload += "\"activeMotor\":" + String(activeMotor2 ? 2 : 1) + ",";
  payload += "\"timerActive\":" + String(timerActive ? "true" : "false") + ",";
  payload += "\"fault\":" + String(motorFault ? "true" : "false") + ",";
  payload += "\"totalLitres\":" + String(totalLitres, 2) + ",";
  payload += "\"totalElectricity\":" + String(totalEnergy, 2) + ",";
  payload += "\"motorOnline\":" + String(motorOnline ? "true" : "false") + ",";
  payload += "\"ultrasonicMode\":" + String(ultrasonicMode ? "true" : "false");
  payload += "}";

  String topic = "device/" + deviceName + "/sensor/data";
  client.publish(topic.c_str(), payload.c_str());
}

// ================= MQTT CALLBACK =================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (int i = 0; i < length; i++) msg += (char)payload[i];

  String topicStr = String(topic);
  String motorTopic = "device/" + deviceName + "/motor/command";
  String timerTopic = "device/" + deviceName + "/timer/command";
  String heightTopic = "device/" + deviceName + "/height/command";
  String switchTopic = "device/" + deviceName + "/motor/switch";
  String ultrasonicTopic = "device/" + deviceName + "/ultrasonic/command";

  // Handle settings response from backend
  if (topicStr == settingsResponseTopic) {
    Serial.println("Received settings from backend:");
    Serial.println(msg);
    
    // Parse JSON: {"height": 100, "activeMotor2": false, "ultrasonicMode": true}
    int heightIndex = msg.indexOf("\"height\":");
    if (heightIndex >= 0) {
      int start = msg.indexOf(":", heightIndex) + 1;
      int end = msg.indexOf(",", start);
      if (end < 0) end = msg.indexOf("}", start);
      String heightStr = msg.substring(start, end);
      heightStr.trim();
      int h = heightStr.toInt();
      if (h > 0) {
        height = h;
        Serial.print("Height set from backend: ");
        Serial.println(height);
      }
    }
    
    int activeMotorIndex = msg.indexOf("\"activeMotor2\":");
    if (activeMotorIndex >= 0) {
      int start = msg.indexOf(":", activeMotorIndex) + 1;
      int end = msg.indexOf(",", start);
      if (end < 0) end = msg.indexOf("}", start);
      String motorStr = msg.substring(start, end);
      motorStr.trim();
      activeMotor2 = (motorStr == "true" || motorStr == "1");
      Serial.print("Active Motor set from backend: ");
      Serial.println(activeMotor2 ? "2" : "1");
    }
    
    int ultrasonicIndex = msg.indexOf("\"ultrasonicMode\":");
    if (ultrasonicIndex >= 0) {
      int start = msg.indexOf(":", ultrasonicIndex) + 1;
      int end = msg.indexOf(",", start);
      if (end < 0) end = msg.indexOf("}", start);
      String ultrasonicStr = msg.substring(start, end);
      ultrasonicStr.trim();
      ultrasonicMode = (ultrasonicStr == "true" || ultrasonicStr == "1");
      Serial.print("Ultrasonic Mode set from backend: ");
      Serial.println(ultrasonicMode ? "AUTO" : "MANUAL");
    }
  }
  else if (topicStr == motorTopic) {
    if (msg == "ON") {
      motorManual = true;
      publishState("MANUAL_ON");
    } 
    else if (msg == "OFF") {
      motorManual = false;
      publishState("MANUAL_OFF");
    }
  }
  else if (topicStr == timerTopic) {
    int sec = msg.toInt();
    if (sec > 0) {
      timerActive = true;
      timerEndTime = millis() + sec * 1000UL;
      publishState("TIMER_START");
    }
  }
  else if (topicStr == heightTopic) {
    int h = msg.toInt();
    if (h >= 0) {
      height = h;
      publishState("HEIGHT_SET");
    }
  }
  else if (topicStr == switchTopic) {
    if (msg == "1") {
      activeMotor2 = false;
      publishState("SWITCH_M1");
    } else if (msg == "2") {
      activeMotor2 = true;
      publishState("SWITCH_M2");
    }
  }
  else if (topicStr == ultrasonicTopic) {
    if (msg == "true" || msg == "1") {
      ultrasonicMode = true;
      publishState("ULTRASONIC_AUTO");
    } else if (msg == "false" || msg == "0") {
      ultrasonicMode = false;
      publishState("ULTRASONIC_MANUAL");
    }
  }
}

// ================= MQTT CONNECT =================
void connectMQTT() {
  while (!client.connected()) {
    String clientId = "ESP32_" + deviceName;
    if (client.connect(clientId.c_str(), mqttUser, mqttPass)) {
      Serial.println("MQTT Connected!");
      
      String motorTopic = "device/" + deviceName + "/motor/command";
      String timerTopic = "device/" + deviceName + "/timer/command";
      String heightTopic = "device/" + deviceName + "/height/command";
      String switchTopic = "device/" + deviceName + "/motor/switch";
      String ultrasonicTopic = "device/" + deviceName + "/ultrasonic/command";
      
      client.subscribe(motorTopic.c_str());
      client.subscribe(timerTopic.c_str());
      client.subscribe(heightTopic.c_str());
      client.subscribe(switchTopic.c_str());
      client.subscribe(ultrasonicTopic.c_str());
      client.subscribe(settingsResponseTopic.c_str());
      
      Serial.println("Subscribed to topics");
      
      // Request settings from backend
      String requestPayload = "{\"deviceName\":\"" + deviceName + "\"}";
      client.publish(settingsRequestTopic.c_str(), requestPayload.c_str());
      Serial.println("Requested settings from backend");
      
      publishState("BOOT");
    } else {
      Serial.print("Failed, rc=");
      Serial.print(client.state());
      Serial.println(" Retrying...");
      delay(2000);
    }
  }
}

// ================= SENSOR + LOGIC =================
void updateLogic() {
  // Water
  int d = sonar.ping_cm();
  if (d > 0) waterDepth = d;

  // Flow
  totalLitres += (pulseCount / 7.5f) / 60.0f;
  pulseCount = 0;

  // Energy
  float p = pzem.power();
  if (!isnan(p)) totalEnergy = p / 1000.0f;

  // Timer
  if (timerActive && millis() >= timerEndTime) {
    timerActive = false;
    motorManual = false;
    publishState("TIMER_END");
  }

  // LEVEL LOGIC - depends on ultrasonicMode
  bool levelDemand = false;
  if (ultrasonicMode) {
    // AUTO mode: use ultrasonic sensor
    levelDemand = (height > 0 && waterDepth < height);
  }
  // MANUAL mode: only manual control or timer
  
  bool demand = motorManual || timerActive || levelDemand;

  String prev = motorState;
  motorState = (demand && !motorFault) ? "ON" : "OFF";

  if (motorState != prev) {
    if (ultrasonicMode && levelDemand) {
      publishState("AUTO_LEVEL");
    } else if (motorState == "OFF" && prev == "ON" && ultrasonicMode) {
      publishState("AUTO_LEVEL_OFF");
    } else {
      publishState("STATE_CHANGE");
    }
  }

  if (motorState == "ON") {
    if (!motorStarted) {
      motorStarted = true;
      motorStartTime = millis();
      applyMotor();
    }
  } else {
    stopMotors();
  }
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  Serial.println("\n\n=== ESP32 Water System ===");

  // Initialize TFT
  tft.initR(INITR_BLACKTAB);
  tft.setRotation(0);
  tft.fillScreen(ST7735_BLACK);
  tft.setTextColor(ST7735_WHITE);
  tft.setTextSize(1);
  tft.setCursor(0, 0);
  tft.print("Starting...");
  delay(500);

  pinMode(MOTOR1_PIN, OUTPUT);
  pinMode(MOTOR2_PIN, OUTPUT);
  pinMode(FLOW_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(FLOW_PIN), pulseCounter, FALLING);

  Serial2.begin(9600, SERIAL_8N1, 16, 17);

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && wifiAttempts < 20) {
    delay(500);
    Serial.print(".");
    wifiAttempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("");
    Serial.println("WiFi connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi connection failed!");
  }

  deviceTopic = "device/" + deviceName;
  settingsRequestTopic = "device/" + deviceName + "/settings/request";
  settingsResponseTopic = "device/" + deviceName + "/settings/response";

  client.setServer(mqttServer, mqttPort);
  client.setCallback(mqttCallback);
  connectMQTT();

  updateDisplay();
  publishState("BOOT");
}

// ================= LOOP =================
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.begin(ssid, password);
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
      delay(500);
      attempts++;
    }
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("WiFi reconnected!");
      connectMQTT();
    }
  }
  
  if (!client.connected() && WiFi.status() == WL_CONNECTED) {
    connectMQTT();
  }
  
  client.loop();

  if (millis() - lastSensor >= 1000) {
    lastSensor = millis();
    updateLogic();
  }
  
  if (millis() - lastPublish >= 10000) {
    lastPublish = millis();
    publishState("SENSOR_TICK");
  }
  
  if (millis() - lastDisplayUpdate >= 1000) {
    lastDisplayUpdate = millis();
    updateDisplay();
  }
}
