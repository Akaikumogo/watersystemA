#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
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

// ------------------------ AP Mode (Configuration) ------------------------
const char* AP_SSID = "ESP32_WaterSystem";
const char* AP_PASS = "water123";
bool useAPMode = false;  // true bo'lsa AP mode, false bo'lsa Station mode
WebServer configServer(80);

// ------------------------ Preferences (EEPROM) ------------------------
Preferences preferences;
const char* PREF_NAMESPACE = "device";
const char* PREF_DEVICE_NAME = "name";
const char* PREF_DEVICE_LOCATION = "location";
const char* PREF_WIFI_SSID = "wifi_ssid";
const char* PREF_WIFI_PASS = "wifi_pass";
const char* PREF_MQTT_SERVER = "mqtt_server";
const char* PREF_MQTT_USER = "mqtt_user";
const char* PREF_MQTT_PASS = "mqtt_pass";

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

// ------------------------ TFT Display Variables (for optimization) ------------------------
String prevWaterDepth = "";
String prevHeight = "";
String prevTotalLitres = "";
String prevMotorState = "";
String prevTotalElectricity = "";
String prevTimerDisplay = "";
unsigned long lastTFTTime = 0;
const unsigned long tftInterval = 1000;  // 1 second

// ------------------------ Hourly Data Publishing ------------------------
unsigned long lastHourlyPublishTime = 0;
const unsigned long hourlyInterval = 3600000;  // 1 hour in milliseconds

// ------------------------ Device Info ------------------------
// Device name va location Preferences dan olinadi yoki default qiymatlar
String deviceName = "ESP32Controller";
String deviceLocation = "Remote node";

// ------------------------ MQTT Topics (dynamic - device name o'zgarganda yangilanadi) ------------------------
String sensorTopic;
String motorTopic;
String timerTopic;
String heightTopic;
String motorSwitchTopic;
String statusTopic;
String languageTopic;

// MQTT topiclarni yangilash funksiyasi
void updateMQTTTopics() {
  sensorTopic = "device/" + deviceName + "/sensor/data";
  motorTopic = "device/" + deviceName + "/motor/command";
  timerTopic = "device/" + deviceName + "/timer/command";
  heightTopic = "device/" + deviceName + "/height/command";
  motorSwitchTopic = "device/" + deviceName + "/motor/switch";
  statusTopic = "device/" + deviceName + "/status";
  languageTopic = "device/" + deviceName + "/language/command";
}

// Also subscribe to global topics for backward compatibility
const char* globalSensorTopic = "sensor/data";
const char* globalStatusTopic = "device/status";

// ------------------------ Preferences Functions ------------------------
void loadPreferences() {
  preferences.begin(PREF_NAMESPACE, false);
  
  // Device name va location ni yuklash
  String savedName = preferences.getString(PREF_DEVICE_NAME, "");
  String savedLocation = preferences.getString(PREF_DEVICE_LOCATION, "");
  
  if (savedName.length() > 0) {
    deviceName = savedName;
  }
  if (savedLocation.length() > 0) {
    deviceLocation = savedLocation;
  }
  
  // WiFi va MQTT sozlamalarini yuklash (agar saqlangan bo'lsa)
  String savedSSID = preferences.getString(PREF_WIFI_SSID, "");
  String savedPass = preferences.getString(PREF_WIFI_PASS, "");
  String savedMqttServer = preferences.getString(PREF_MQTT_SERVER, "");
  
  // Agar Preferences da saqlangan bo'lsa, ularni ishlatish
  // Aks holda kod ichidagi default qiymatlar ishlatiladi
  
  preferences.end();
  
  // MQTT topiclarni yangilash
  updateMQTTTopics();
  
  Serial.print("Loaded device name: ");
  Serial.println(deviceName);
  Serial.print("Loaded device location: ");
  Serial.println(deviceLocation);
}

void saveDeviceName(String name) {
  preferences.begin(PREF_NAMESPACE, false);
  preferences.putString(PREF_DEVICE_NAME, name);
  preferences.end();
  deviceName = name;
  updateMQTTTopics();
  Serial.print("Device name saved: ");
  Serial.println(deviceName);
}

void saveDeviceLocation(String location) {
  preferences.begin(PREF_NAMESPACE, false);
  preferences.putString(PREF_DEVICE_LOCATION, location);
  preferences.end();
  deviceLocation = location;
  Serial.print("Device location saved: ");
  Serial.println(deviceLocation);
}

// ------------------------ Web Server Handlers ------------------------
void handleConfigRoot() {
  const char html[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ESP32 Sozlash</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 500px; margin: auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #333; text-align: center; margin-bottom: 30px; }
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 5px; font-weight: bold; color: #555; }
    input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; font-size: 14px; }
    button { width: 100%; padding: 12px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: bold; }
    button:hover { background: #1d4ed8; }
    .info { background: #e0f2fe; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
    .info p { margin: 5px 0; color: #0369a1; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔧 ESP32 Sozlash</h1>
    
    <div class="info">
      <p><strong>IP:</strong> <span id="ap-ip">192.168.4.1</span></p>
      <p><strong>Joriy Device Name:</strong> <span id="current-name">ESP32Controller</span></p>
    </div>
    
    <form id="configForm">
      <div class="form-group">
        <label for="deviceName">Device Name (MQTT topic uchun):</label>
        <input type="text" id="deviceName" name="deviceName" placeholder="ESP32Controller" required>
        <small style="color: #666;">Backend dagi device name bilan mos kelishi kerak</small>
      </div>
      
      <div class="form-group">
        <label for="deviceLocation">Location (Ixtiyoriy):</label>
        <input type="text" id="deviceLocation" name="deviceLocation" placeholder="Remote node">
      </div>
      
      <button type="submit">Saqlash va Qayta ishga tushirish</button>
    </form>
    
    <div id="message" style="margin-top: 20px; padding: 10px; border-radius: 4px; display: none;"></div>
  </div>
  
  <script>
    // Joriy device name ni yuklash
    fetch('/config')
      .then(res => res.json())
      .then(data => {
        if (data.deviceName) {
          document.getElementById('deviceName').value = data.deviceName;
          document.getElementById('current-name').textContent = data.deviceName;
        }
        if (data.deviceLocation) {
          document.getElementById('deviceLocation').value = data.deviceLocation;
        }
      });
    
    document.getElementById('configForm').addEventListener('submit', function(e) {
      e.preventDefault();
      const formData = new FormData(this);
      const data = {
        deviceName: formData.get('deviceName'),
        deviceLocation: formData.get('deviceLocation')
      };
      
      fetch('/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      .then(res => res.json())
      .then(result => {
        const msgDiv = document.getElementById('message');
        msgDiv.style.display = 'block';
        if (result.success) {
          msgDiv.style.background = '#d1fae5';
          msgDiv.style.color = '#065f46';
          msgDiv.textContent = '✅ Sozlamalar saqlandi! ESP32 qayta ishga tushmoqda...';
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          msgDiv.style.background = '#fee2e2';
          msgDiv.style.color = '#991b1b';
          msgDiv.textContent = '❌ Xatolik: ' + (result.error || 'Noma\'lum xatolik');
        }
      })
      .catch(err => {
        const msgDiv = document.getElementById('message');
        msgDiv.style.display = 'block';
        msgDiv.style.background = '#fee2e2';
        msgDiv.style.color = '#991b1b';
        msgDiv.textContent = '❌ Xatolik: ' + err.message;
      });
    });
  </script>
</body>
</html>
)rawliteral";
  configServer.send(200, "text/html", html);
}

void handleConfigGet() {
  String json = "{";
  json += "\"deviceName\":\"" + deviceName + "\",";
  json += "\"deviceLocation\":\"" + deviceLocation + "\"";
  json += "}";
  configServer.send(200, "application/json", json);
}

void handleConfigPost() {
  if (configServer.hasArg("plain")) {
    String body = configServer.arg("plain");
    
    // JSON parsing (oddiy)
    int nameStart = body.indexOf("\"deviceName\":\"") + 15;
    int nameEnd = body.indexOf("\"", nameStart);
    int locStart = body.indexOf("\"deviceLocation\":\"") + 18;
    int locEnd = body.indexOf("\"", locStart);
    
    if (nameStart > 14 && nameEnd > nameStart) {
      String newName = body.substring(nameStart, nameEnd);
      if (newName.length() > 0 && newName.length() < 50) {
        saveDeviceName(newName);
      }
    }
    
    if (locStart > 17 && locEnd > locStart) {
      String newLocation = body.substring(locStart, locEnd);
      if (newLocation.length() > 0) {
        saveDeviceLocation(newLocation);
      }
    }
    
    String response = "{\"success\":true,\"message\":\"Sozlamalar saqlandi\"}";
    configServer.send(200, "application/json", response);
    
    // Qayta ishga tushirish (2 soniyadan keyin)
    delay(2000);
    ESP.restart();
  } else {
    configServer.send(400, "application/json", "{\"success\":false,\"error\":\"Invalid request\"}");
  }
}

void setupAP() {
  WiFi.softAP(AP_SSID, AP_PASS);
  IPAddress IP = WiFi.softAPIP();
  Serial.print("AP IP: ");
  Serial.println(IP);
  
  tft.setCursor(0, 20);
  tft.setTextColor(ST77XX_GREEN);
  tft.print("AP IP: ");
  tft.println(IP);
  
  // Web server routes
  configServer.on("/", handleConfigRoot);
  configServer.on("/config", HTTP_GET, handleConfigGet);
  configServer.on("/config", HTTP_POST, handleConfigPost);
  configServer.begin();
  
  Serial.println("Configuration WebServer started");
}

// ------------------------ Setup ------------------------
void setup() {
  Serial.begin(115200);
  delay(100);

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

  // Preferences dan sozlamalarni yuklash
  loadPreferences();

  // WiFi ulanish
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi...");
  
  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && wifiAttempts < 20) {
    delay(500);
    Serial.print(".");
    wifiAttempts++;
  }
  
  if (WiFi.status() != WL_CONNECTED) {
    // WiFi ulanmadi - AP mode ga o'tamiz
    Serial.println("\nWiFi ulanmadi, AP mode ga o'tilmoqda...");
    useAPMode = true;
    setupAP();
  } else {
    Serial.println("\nWiFi connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    
    // MQTT sozlash
    client.setServer(mqttServer, mqttPort);
    client.setCallback(mqttCallback);
  }

  Serial2.begin(9600, SERIAL_8N1, 16, 17);
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
  // AP mode bo'lsa, faqat web server ishlaydi
  if (useAPMode) {
    configServer.handleClient();
    delay(10);
    return;
  }
  
  // Station mode - normal ish
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
  
  // Publish data every hour for reports (real-time hourly data)
  unsigned long now = millis();
  if (now - lastHourlyPublishTime >= hourlyInterval) {
    publishData();
    lastHourlyPublishTime = now;
  }
  
  // Update TFT display every 1 second
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
    // Publish status immediately when timer expires
    publishData();
    publishStatus("online");
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


