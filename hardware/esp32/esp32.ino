#include <WiFi.h>
#include <Preferences.h>
#include <PubSubClient.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>
#include <PZEM004Tv30.h>
#include <NewPing.h>

// ================= WIFI & MQTT =================
const char* ssid = "Mercusys_4A05";
const char* password = "bbbbbbbb9";

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
bool ultrasonicMode = true; // true = AUTO (ultrasonic), false = MANUAL
bool motorOnline = false;   // motor health/status (not measured here)

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

// ================= MQTT PUBLISH (GLOBAL) =================
void publishState(String event) {
  if (!client.connected()) return;

  // ONLINE/OFFLINE holati
  String status = (WiFi.status() == WL_CONNECTED && client.connected()) ? "ONLINE" : "OFFLINE";

  // Sensor/payload
  String payload = "{";
  payload += "\"deviceName\":\"" + deviceName + "\",";
  payload += "\"status\":\"" + status + "\",";
  payload += "\"waterDepth\":" + String(waterDepth) + ",";
  payload += "\"height\":" + String(height) + ",";
  payload += "\"motorState\":\"" + motorState + "\",";
  payload += "\"motorBy\":\"" + event + "\",";
  payload += "\"activeMotor\":" + String(activeMotor2 ? 2 : 1) + ",";
  payload += "\"activeMotor2\":" + String(activeMotor2 ? "true" : "false") + ",";
  payload += "\"timerActive\":" + String(timerActive ? "true" : "false") + ",";
  payload += "\"fault\":" + String(motorFault ? "true" : "false") + ",";
  payload += "\"totalLitres\":" + String(totalLitres, 2) + ",";
  payload += "\"totalElectricity\":" + String(totalEnergy, 2) + ",";
  payload += "\"motorOnline\":" + String(motorOnline ? "true" : "false") + ",";
  payload += "\"ultrasonicMode\":" + String(ultrasonicMode ? "true" : "false");
  payload += "}";

  // Yangi sensor/data topic
  String sensorTopic = "device/" + deviceName + "/sensor/data";
  client.publish(sensorTopic.c_str(), payload.c_str());

  // Status alohida topic
  String statusTopic = "device/" + deviceName + "/status";
  // Statusga asosiy metrikalarni ham qo'shamiz (front uchun)
  String statusPayload = "{";
  statusPayload += "\"deviceName\":\"" + deviceName + "\",";
  statusPayload += "\"status\":\"" + status + "\",";
  statusPayload += "\"waterDepth\":" + String(waterDepth) + ",";
  statusPayload += "\"height\":" + String(height) + ",";
  statusPayload += "\"totalLitres\":" + String(totalLitres, 2) + ",";
  statusPayload += "\"totalElectricity\":" + String(totalEnergy, 2) + ",";
  statusPayload += "\"motorState\":\"" + motorState + "\",";
  statusPayload += "\"activeMotor2\":" + String(activeMotor2 ? "true" : "false") + ",";
  statusPayload += "\"ultrasonicMode\":" + String(ultrasonicMode ? "true" : "false");
  statusPayload += "}";
  client.publish(statusTopic.c_str(), statusPayload.c_str());
}

// ================= DISPLAY =================
void updateDisplay() {
  // Ekranni bir marta tozalash faqat birinchi marta
  static bool firstRun = true;
  if (firstRun) {
    tft.fillScreen(ST7735_BLACK);
    firstRun = false;
  }

  tft.setTextColor(ST7735_WHITE);
  tft.setTextSize(1); // o'rtacha o'lcham

  // Sarlavha (faqat birinchi marta)
  static bool titleDrawn = false;
  if (!titleDrawn) {
    tft.setCursor(0, 0);
    tft.print("Water System");
    tft.drawFastHLine(0, 10, 160, ST7735_WHITE);
    titleDrawn = true;
  }

  // Har bir satrni alohida tozalash va yangilash (flickering yo'q)
  auto updateLine = [&](int y, const String &label, const String &value) {
    // Faqat o'sha satrni tozalash (160px kenglik, 12px balandlik)
    tft.fillRect(0, y, 160, 12, ST7735_BLACK);
    tft.setCursor(0, y);
    tft.print(label);
    tft.print(value);
  };

  int y = 14;
  updateLine(y, "Suv sathi: ", String(waterDepth) + " cm");
  y += 12;
  updateLine(y, "Balandlik: ", String(height) + " cm");
  y += 12;
  updateLine(y, "Motor: ", motorState);
  y += 12;
  updateLine(y, "Motor ", String(activeMotor2 ? "2" : "1"));
  y += 12;
  updateLine(y, "Suv: ", String(totalLitres, 1) + " L");
  y += 12;
  updateLine(y, "Energiya: ", String(totalEnergy, 2) + " kWh");
  y += 12;
  
  // Mode: AUTO/MANUAL (ultrasonicMode ga qarab)
  updateLine(y, "Mode: ", ultrasonicMode ? "AUTO" : "MANUAL");
  y += 12;

  // Timer
  String timerLine = "OFF";
  if (timerActive) {
    long remainMs = (long)timerEndTime - (long)millis();
    if (remainMs < 0) remainMs = 0;
    timerLine = String(remainMs / 1000) + " s";
  }
  updateLine(y, "Timer: ", timerLine);
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
  String settingsRespTopic = "device/" + deviceName + "/settings/response";

  // Settings javobi
  if (topicStr == settingsResponseTopic || topicStr == settingsRespTopic) {
    // Parse JSON: {"height":100,"activeMotor2":false,"ultrasonicMode":true} yoki {"ultrasonic": true}
    int hIdx = msg.indexOf("\"height\":");
    if (hIdx >= 0) {
      int s = msg.indexOf(":", hIdx) + 1;
      int e = msg.indexOf(",", s);
      if (e < 0) e = msg.indexOf("}", s);
      int h = msg.substring(s, e).toInt();
      if (h > 0) {
        height = h;
        publishState("HEIGHT_SET");
      }
    }
    int mIdx = msg.indexOf("\"activeMotor2\":");
    if (mIdx >= 0) {
      int s = msg.indexOf(":", mIdx) + 1;
      int e = msg.indexOf(",", s);
      if (e < 0) e = msg.indexOf("}", s);
      String v = msg.substring(s, e); v.trim();
      activeMotor2 = (v == "true" || v == "1");
      publishState(activeMotor2 ? "SWITCH_M2" : "SWITCH_M1");
    }
    // ultrasonicMode yoki ultrasonic kalitlari
    int uIdx = msg.indexOf("\"ultrasonicMode\":");
    if (uIdx < 0) uIdx = msg.indexOf("\"ultrasonic\":");
    if (uIdx >= 0) {
      int s = msg.indexOf(":", uIdx) + 1;
      int e = msg.indexOf(",", s);
      if (e < 0) e = msg.indexOf("}", s);
      String v = msg.substring(s, e); v.trim();
      ultrasonicMode = (v == "true" || v == "1");
      publishState(ultrasonicMode ? "ULTRASONIC_AUTO" : "ULTRASONIC_MANUAL");
    }
    return;
  }

  // Legacy single-topic commands
  if (topicStr == deviceTopic) {
    if (msg == "ON") {
      motorManual = true;
      publishState("MANUAL_ON");
    } 
    else if (msg == "OFF") {
      motorManual = false;
      publishState("MANUAL_OFF");
    }
    else if (msg.startsWith("H=")) {
      height = msg.substring(2).toInt();
      publishState("HEIGHT_SET");
    }
    else if (msg.startsWith("T=")) {
      int sec = msg.substring(2).toInt();
      timerActive = true;
      timerEndTime = millis() + sec * 1000UL;
      publishState("TIMER_START");
    }
    else if (msg == "M1") {
      activeMotor2 = false;
      publishState("SWITCH_M1");
    }
    else if (msg == "M2") {
      activeMotor2 = true;
      publishState("SWITCH_M2");
    }
  }

  // New per-topic commands
  if (topicStr == motorTopic) {
    if (msg == "ON") {
      motorManual = true;
      publishState("MANUAL_ON");
    } else if (msg == "OFF") {
      motorManual = false;
      publishState("MANUAL_OFF");
    }
  } else if (topicStr == timerTopic) {
    int sec = msg.toInt();
    if (sec > 0) {
      timerActive = true;
      timerEndTime = millis() + sec * 1000UL;
      publishState("TIMER_START");
    }
  } else if (topicStr == heightTopic) {
    int h = msg.toInt();
    if (h >= 0) {
      height = h;
      publishState("HEIGHT_SET");
    }
  } else if (topicStr == switchTopic) {
    if (msg == "1") {
      activeMotor2 = false;
      publishState("SWITCH_M1");
    } else if (msg == "2") {
      activeMotor2 = true;
      publishState("SWITCH_M2");
    }
  } else if (topicStr == ultrasonicTopic) {
    if (msg == "true" || msg == "1" || msg == "AUTO") {
      ultrasonicMode = true;
      publishState("ULTRASONIC_AUTO");
    } else if (msg == "false" || msg == "0" || msg == "MANUAL") {
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
      // Topics
      String motorTopic = "device/" + deviceName + "/motor/command";
      String timerTopic = "device/" + deviceName + "/timer/command";
      String heightTopic = "device/" + deviceName + "/height/command";
      String switchTopic = "device/" + deviceName + "/motor/switch";
      String ultrasonicTopic = "device/" + deviceName + "/ultrasonic/command";
      String settingsRespTopic = "device/" + deviceName + "/settings/response";

      // Legacy single-topic commands
      client.subscribe(deviceTopic.c_str());
      // Structured topics
      client.subscribe(motorTopic.c_str());
      client.subscribe(timerTopic.c_str());
      client.subscribe(heightTopic.c_str());
      client.subscribe(switchTopic.c_str());
      client.subscribe(ultrasonicTopic.c_str());
      client.subscribe(settingsResponseTopic.c_str());
      client.subscribe(settingsRespTopic.c_str());

      // Request settings from backend
      String requestPayload = "{\"deviceName\":\"" + deviceName + "\"}";
      client.publish(settingsRequestTopic.c_str(), requestPayload.c_str());

      publishState("BOOT");
    } else {
      delay(500);
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

  // LEVEL LOGIC (ultrasonicMode => AUTO, otherwise manual/timer only)
  bool levelDemand = false;
  if (ultrasonicMode) {
    levelDemand = (height > 0 && waterDepth < height);
  }
  bool demand = motorManual || timerActive || levelDemand;

  String prev = motorState;
  motorState = (demand && !motorFault) ? "ON" : "OFF";

  if (motorState != prev) {
    if (ultrasonicMode && levelDemand) {
      publishState("AUTO_LEVEL");
    } else if (ultrasonicMode && prev == "ON" && motorState == "OFF") {
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

  pinMode(MOTOR1_PIN, OUTPUT);
  pinMode(MOTOR2_PIN, OUTPUT);
  pinMode(FLOW_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(FLOW_PIN), pulseCounter, FALLING);

  Serial2.begin(9600, SERIAL_8N1, 16, 17);

  // TFT init
  tft.initR(INITR_BLACKTAB);
  tft.setRotation(1); // o'ngdan chapga (landshaft)
  tft.fillScreen(ST7735_BLACK);
  tft.setTextColor(ST7735_WHITE);
  tft.setTextSize(2);
  tft.setCursor(0, 0);
  tft.print("Starting...");

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);

  deviceTopic = "device/" + deviceName;
  settingsRequestTopic = "device/" + deviceName + "/settings/request";
  settingsResponseTopic = "device/" + deviceName + "/settings/response";

  client.setServer(mqttServer, mqttPort);
  client.setCallback(mqttCallback);
  connectMQTT();

  publishState("BOOT");
  updateDisplay();
}

// ================= LOOP =================
void loop() {
  client.loop();

  if (millis() - lastSensor >= 1000) {
    lastSensor = millis();
    updateLogic();
    publishState("SENSOR_TICK");
  }

  if (millis() - lastDisplayUpdate >= 1000) {
    lastDisplayUpdate = millis();
    updateDisplay();
  }
}
