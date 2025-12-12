# ESP32 Water System Hardware Documentation

## Umumiy Ma'lumot

Bu loyiha ESP32 mikrokontrolleri asosida suv tizimini boshqarish uchun yaratilgan. Qurilma real-time sensor ma'lumotlarini o'qiydi, motor'ni boshqaradi va MQTT orqali backend server bilan ma'lumot almashadi.

---

## Komponentlar

### 1. ESP32 DevKit

- **Model**: ESP32-WROOM-32
- **Funksiyalar**: Wi-Fi, MQTT client, Web server

### 2. PZEM004T v3.0

- **Maqsad**: Tok va quvvat o'lchash
- **Ulanish**: Serial2 (GPIO 16, 17)
- **O'lchaydi**:
  - Voltage (V)
  - Current (A)
  - Power (W)
  - Energy (kWh)

### 3. HC-SR04 Ultrasonic Sensor

- **Maqsad**: Suv chuqurligini o'lchash
- **Ulanish**:
  - TRIG: GPIO 26
  - ECHO: GPIO 27
- **Masofa**: 2-400 cm

### 4. Water Flow Sensor

- **Maqsad**: Suv oqimini o'lchash
- **Ulanish**: GPIO 25 (interrupt pin)
- **Kalibratsiya**: 7.5 pulse/liter

### 5. TFT Display (ST7735)

- **O'lcham**: 1.8" 128x160
- **Ulanish**:
  - CS: GPIO 5
  - RST: GPIO 4
  - DC: GPIO 22
- **Funksiya**: Real-time ma'lumotlarni ko'rsatish

### 6. Motor Control

- **Motor 1**: GPIO 2
- **Motor 2**: GPIO 12
- **Boshqaruv**: Digital HIGH/LOW

---

## Pinout Diagram

```
ESP32 Pinout:
├── GPIO 2  → Motor 1 Control
├── GPIO 4  → TFT RST
├── GPIO 5  → TFT CS
├── GPIO 12 → Motor 2 Control
├── GPIO 16 → PZEM004T RX
├── GPIO 17 → PZEM004T TX
├── GPIO 22 → TFT DC
├── GPIO 25 → Water Flow Sensor (Interrupt)
├── GPIO 26 → Ultrasonic TRIG
└── GPIO 27 → Ultrasonic ECHO
```

---

## Dasturiy Ta'minot

### Asosiy Funksiyalar

#### 1. Wi-Fi va MQTT Ulanishi

```cpp
// Wi-Fi sozlamalari
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASS";

// MQTT sozlamalari
const char* mqttServer = "BROKER_IP";
const int mqttPort = 1883;
```

**Qayta ulanish mexanizmi**:

- Agar MQTT broker'ga ulanib bo'lmasa, har 5 soniyada qayta urinadi
- Wi-Fi uzilgan bo'lsa, qayta ulanadi

---

#### 2. Sensor O'qish

**updateSensors()** funksiyasi har sekundda chaqiriladi:

```cpp
void updateSensors() {
  // 1. Suv chuqurligi (Ultrasonic)
  int measuredDepth = sonar.ping_cm();
  if (measuredDepth > 0) waterDepth = measuredDepth;

  // 2. Suv oqimi (Flow sensor)
  float flowRate = (pulseCount / 7.5);
  totalLitres += flowRate / 60.0;
  pulseCount = 0;

  // 3. Tok sarfi (PZEM004T)
  float powerWatts = pzem.power();
  if (!isnan(powerWatts))
    totalElectricity = round((powerWatts / 1000.0) * 100.0) / 100.0;
}
```

**Izoh**:

- `totalElectricity` - jami tok sarfi (kWh)
- Har soatda bir marta backend'ga yuboriladi

---

#### 3. Motor Boshqaruvi

**Motor Yoqish**:

```cpp
if (motorState == "ON" && !motorFault) {
  if (activeMotor2) {
    digitalWrite(MOTOR2_PIN, HIGH);
    digitalWrite(MOTOR1_PIN, LOW);
  } else {
    digitalWrite(MOTOR1_PIN, HIGH);
    digitalWrite(MOTOR2_PIN, LOW);
  }
}
```

**Motor O'chirish**:

```cpp
digitalWrite(MOTOR1_PIN, LOW);
digitalWrite(MOTOR2_PIN, LOW);
```

**Avtomatik Boshqaruv**:

- Agar `height > waterDepth` bo'lsa → Motor ON
- Agar `height <= waterDepth` bo'lsa → Motor OFF
- Timer tugaganda → Motor OFF

---

#### 4. Timer Mexanizmi

**Timer O'rnatish**:

```cpp
// MQTT callback'da
int timerSeconds = msg.toInt();
timerDuration = timerSeconds * 1000;  // Millisekundlarga
timerEndTime = millis() + timerDuration;
timerActive = true;
motorNew = true;  // Motor yoqiladi
```

**Timer Tugashi**:

```cpp
// loop() funksiyasida
if (timerActive && millis() >= timerEndTime) {
  timerActive = false;
  motorNew = false;
  motorState = "OFF";
  publishData();      // Status yuborish
  publishStatus("online");
}
```

**Muammo va Yechim**:

- **Muammo**: Timer tugaganda ESP32 faqat o'zida motor'ni o'chiradi, lekin backend'ga xabar yubormaydi
- **Yechim**: Timer tugaganda `publishData()` va `publishStatus()` chaqiriladi

---

#### 5. Motor Xatolik Aniqlash

**Current Monitoring**:

```cpp
float currentVal = pzem.current();

// Motor start qilgandan 10 soniya o'tgach
if (millis() - motorStartTime >= motorStartDelay) {
  if (currentVal < minCurrent || currentVal > maxCurrent) {
    // Motor xatolik
    if (activeMotor2) {
      motorFault = true;  // Ikkala motor ham xatolik
    } else {
      activeMotor2 = true;  // Motor 2 ga o'tish
      motorStarted = false;
    }
  }
}
```

**Parametrlar**:

- `minCurrent`: 0.05 A (motor ishlamayapti)
- `maxCurrent`: 10.0 A (qisqa tutashuv)
- `motorStartDelay`: 10000 ms (10 soniya)

---

#### 6. TFT Display

**Ko'rsatiladigan Ma'lumotlar**:

1. Suv chuqurligi (cm)
2. Maqsadli balandlik (cm)
3. Jami suv sarfi (L)
4. Jami tok sarfi (kWh)
5. Motor holati (ON/OFF)
6. Timer qolgan vaqti (MM:SS)

**Optimizatsiya**:

- Faqat o'zgargan ma'lumotlar yangilanadi
- Har sekundda bir marta yangilanadi

---

#### 7. AP Mode (Configuration)

Agar Wi-Fi sozlamalari noto'g'ri bo'lsa, ESP32 AP mode'ga o'tadi:

- **SSID**: `ESP32_WaterSystem`
- **Password**: `water123`
- **IP**: `192.168.4.1`

**Web Interface**:

- Wi-Fi sozlamalari
- MQTT sozlamalari
- Device nomi va joylashuvi

---

## MQTT Integration

### Subscribe Qilingan Topic'lar

```cpp
// Device-specific
device/{deviceName}/motor/command
device/{deviceName}/timer/command
device/{deviceName}/height/command
device/{deviceName}/motor/switch
device/{deviceName}/language/command

// Global (backward compatibility)
motor/command
timer/command
height/command
motor/switch
```

### Publish Qilinadigan Topic'lar

```cpp
// Device-specific
device/{deviceName}/sensor/data
device/{deviceName}/status

// Global (backward compatibility)
sensor/data
device/status
```

**Batafsil**: [MQTT_DOCUMENTATION.md](./MQTT_DOCUMENTATION.md) faylini ko'ring.

---

## Tok Sarfi Hisoblash

### Real-time Hisoblash

```cpp
float powerWatts = pzem.power();  // Hozirgi quvvat (W)
if (!isnan(powerWatts)) {
  // kWh ga o'tkazish
  totalElectricity = round((powerWatts / 1000.0) * 100.0) / 100.0;
}
```

**Izoh**:

- `powerWatts` - hozirgi quvvat (Watt)
- `totalElectricity` - jami tok sarfi (kWh)
- Har soatda bir marta backend'ga yuboriladi

### Backend'da Saqlash

- Har soatda (Cron: `0 * * * *`)
- `EnergyConsumption` collection'ga saqlanadi
- Har bir user uchun alohida saqlanadi

**Hisobotlar**:

- Kunlik: `/api/v1/reports/daily`
- Haftalik: `/api/v1/reports/weekly`
- Oylik: `/api/v1/reports/monthly`
- Yillik: `/api/v1/reports/yearly`

---

## Sozlash

### 1. Wi-Fi Sozlamalari

```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASS";
```

Yoki Preferences orqali:

```cpp
preferences.putString(PREF_WIFI_SSID, "YOUR_WIFI_SSID");
preferences.putString(PREF_WIFI_PASS, "YOUR_WIFI_PASS");
```

### 2. MQTT Sozlamalari

```cpp
const char* mqttServer = "BROKER_IP";
const int mqttPort = 1883;
const char* mqttUser = "USERNAME";  // Ixtiyoriy
const char* mqttPass = "PASSWORD";  // Ixtiyoriy
```

### 3. Device Nomini O'zgartirish

```cpp
String deviceName = "ESP32Controller";  // Default
// Yoki Preferences dan:
deviceName = preferences.getString(PREF_DEVICE_NAME, "ESP32Controller");
```

---

## Xatoliklar va Yechimlar

### 1. MQTT Ulanmayapti

**Sabablar**:

- Wi-Fi ulanmagan
- MQTT broker ishlamayapti
- Noto'g'ri IP yoki port

**Yechim**:

- Serial monitor'da xatoliklarni tekshiring
- Wi-Fi sozlamalarini tekshiring
- MQTT broker'ni tekshiring

### 2. Sensor Ma'lumotlari Noto'g'ri

**Sabablar**:

- Sensor ulanishi noto'g'ri
- Sensor xatolik

**Yechim**:

- Pin ulanishlarini tekshiring
- Sensor'ni almashtiring
- Serial monitor'da qiymatlarni tekshiring

### 3. Motor Ishlamayapti

**Sabablar**:

- Motor xatolik (`motorFault = true`)
- Pin ulanishi noto'g'ri
- Relay ishlamayapti

**Yechim**:

- Serial monitor'da `motorFault` holatini tekshiring
- Pin ulanishlarini tekshiring
- Relay'ni tekshiring

### 4. Timer Tugaganda Motor O'chmayapti

**Sabablar**:

- Timer tugaganda status yuborilmayapti
- Backend timer'ni to'g'ri qayta ishlamayapti

**Yechim**:

- ESP32 kodida timer tugaganda `publishData()` chaqirilishini tekshiring
- Backend cron job'ni tekshiring

---

## Test Qilish

### 1. Serial Monitor

```cpp
Serial.begin(115200);
Serial.println("ESP32 Water System Started");
```

**Ko'rsatiladigan Ma'lumotlar**:

- Wi-Fi ulanish holati
- MQTT ulanish holati
- Sensor qiymatlari
- Motor holati
- Timer holati

### 2. MQTT Client

Mosquitto CLI orqali:

```bash
# Sensor ma'lumotlarini kuzatish
mosquitto_sub -h localhost -t "device/+/sensor/data" -v

# Motor yoqish
mosquitto_pub -h localhost -t "device/ESP32Controller/motor/command" -m "ON"
```

### 3. Web Interface

AP mode'da:

- `http://192.168.4.1` ga kiring
- Sozlamalarni o'zgartiring

---

## Versiya Tarixi

- **v1.0**: Asosiy funksiyalar (sensor, motor, MQTT)
- **v1.1**: Timer funksiyasi qo'shildi
- **v1.2**: TFT display qo'shildi
- **v1.3**: Motor xatolik aniqlash qo'shildi
- **v1.4**: AP mode qo'shildi
- **v1.5**: Multi-language qo'llab-quvvatlash
- **v1.6**: Timer tugaganda status yuborish tuzatildi

---

## Yordam

Agar muammo bo'lsa:

1. Serial monitor'da xatoliklarni tekshiring
2. Pin ulanishlarini tekshiring
3. MQTT broker'ni tekshiring
4. Sensor'lar ishlayotganini tekshiring
5. Logger xabarlarini ko'rib chiqing

---

## Litsenziya

Bu loyiha MIT litsenziyasi ostida tarqatiladi.
