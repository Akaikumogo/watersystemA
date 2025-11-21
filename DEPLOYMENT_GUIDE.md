# Smart Water System - Deployment Guide

## 📋 Loyiha Ssenariysi

### Step 1: Admin Login va User Yaratish

1. **Admin Panel ga kirish:**
   - URL: `http://localhost:3000` (yoki production URL)
   - Username: `admin`
   - Password: `admin123`

2. **User yaratish:**
   - Admin panel → Users → Create User
   - Username: `user1` (yoki istalgan)
   - Password: `password123` (yoki istalgan)
   - Role: `USER`

### Step 2: User Login va Device Yaratish

1. **User Frontend ga kirish:**
   - URL: `http://localhost:3001` (yoki production URL)
   - Username: `user1`
   - Password: `password123`

2. **Device yaratish:**
   - Dashboard → Create Device
   - **Device Name:** `Device1` (yoki istalgan, lekin ESP32 da ham shu nom ishlatiladi)
   - **Location:** `Building A, Floor 2` (yoki istalgan)
   - Create qilish

   ⚠️ **MUHIM:** Device name ni yaxshi eslab qoling, chunki ESP32 da ham shu nom ishlatiladi!

### Step 3: ESP32 Sozlash

ESP32 ni o'rnatgandan keyin quyidagi sozlamalarni qilish kerak:

#### 3.1. ESP32 Kodini Sozlash

`hardware/esp32/monitoring_controller.ino` faylida quyidagi o'zgaruvchilarni sozlash:

```cpp
// WiFi sozlamalari
const char* ssid = "YOUR_WIFI_SSID";           // WiFi SSID
const char* password = "YOUR_WIFI_PASS";        // WiFi parol

// MQTT Broker sozlamalari
const char* mqttServer = "BROKER_IP";           // MQTT broker IP (masalan: "192.168.1.100")
const int mqttPort = 1883;                      // MQTT port (odatda 1883)
const char* mqttUser = "USERNAME";              // MQTT username (agar kerak bo'lsa)
const char* mqttPass = "PASSWORD";              // MQTT password (agar kerak bo'lsa)

// Device name (Backend dagi device name bilan mos kelishi kerak!)
String deviceName = "Device1";                  // Backend da yaratilgan device name
String deviceLocation = "Building A, Floor 2";  // Backend da yaratilgan location
```

#### 3.2. ESP32 da Device Name ni Sozlash

ESP32 kodida `deviceName` ni backend dagi device name bilan moslashtirish kerak:

**Variant 1: Kod ichida o'zgartirish**
```cpp
// Line 100 da
String deviceName = "Device1";  // Backend dagi device name bilan mos
```

**Variant 2: AP Mode orqali sozlash (Tavsiya etiladi)**

1. ESP32 ni ishga tushiring
2. Agar WiFi ulanmagan bo'lsa, ESP32 AP mode ga o'tadi
3. WiFi ro'yxatidan `ESP32_WaterSystem` ni toping
4. Parol: `water123`
5. Browser da `192.168.4.1` ga kiring
6. Device Name ni kiriting (backend dagi device name)
7. Location ni kiriting
8. Saqlash va qayta ishga tushirish

#### 3.3. MQTT Topic Strukturasi

ESP32 quyidagi topiclarga ma'lumot yuboradi:

**Sensor Data:**
```
Topic: device/{deviceName}/sensor/data
Payload: {
  "deviceName": "Device1",
  "location": "Building A, Floor 2",
  "waterDepth": 150,
  "height": 100,
  "totalLitres": 5000.50,
  "totalElectricity": 25.75,
  "motorState": "ON",
  "timerActive": false
}
```

**Status:**
```
Topic: device/{deviceName}/status
Payload: "online"
```

ESP32 quyidagi topiclardan buyruqlar qabul qiladi:

**Motor Control:**
```
Topic: device/{deviceName}/motor/command
Payload: "ON" yoki "OFF"
```

**Timer:**
```
Topic: device/{deviceName}/timer/command
Payload: "60" (sekundlarda)
```

**Height:**
```
Topic: device/{deviceName}/height/command
Payload: "100" (cm)
```

**Motor Switch:**
```
Topic: device/{deviceName}/motor/switch
Payload: "1" (motor1) yoki "2" (motor2)
```

### Step 4: Backend MQTT Broker Sozlash

Backend `.env` faylida quyidagi sozlamalarni qo'shing:

```env
MQTT_BROKER_URL=mqtt://192.168.1.100:1883
MQTT_USERNAME=your_username
MQTT_PASSWORD=your_password
```

### Step 5: Test Qilish

1. **ESP32 ni ishga tushiring**
2. **Backend ni ishga tushiring:**
   ```bash
   cd smart_water_backend
   npm run start:dev
   ```

3. **User Frontend da tekshiring:**
   - Device list da yangi device ko'rinishi kerak
   - Device status "ONLINE" bo'lishi kerak
   - Real-time ma'lumotlar ko'rinishi kerak

4. **Motor Control test:**
   - Device detail page ga kiring
   - Motor ON/OFF tugmasini bosing
   - ESP32 da motor yoqilishi/o'chilishi kerak

## 🔧 ESP32 MQTT Sozlash Qo'llanmasi

### MQTT Broker O'rnatish (Mosquitto)

**Linux/Mac:**
```bash
sudo apt-get install mosquitto mosquitto-clients  # Linux
brew install mosquitto                            # Mac
```

**Windows:**
- Mosquitto ni [rasmiy saytdan](https://mosquitto.org/download/) yuklab oling va o'rnating

**Mosquitto ni ishga tushirish:**
```bash
mosquitto -c /etc/mosquitto/mosquitto.conf
```

### MQTT Broker IP ni Topish

**Linux/Mac:**
```bash
ifconfig | grep "inet "  # IP manzilni topish
```

**Windows:**
```bash
ipconfig  # IP manzilni topish
```

### ESP32 da MQTT Test Qilish

ESP32 Serial Monitor da quyidagi xabarlarni ko'rish kerak:

```
Connecting to WiFi...
WiFi connected!
IP: 192.168.1.50
Connecting MQTT...
Connected
Subscribed to device topics for: Device1
```

### Backend da MQTT Test Qilish

Backend console da quyidagi xabarlarni ko'rish kerak:

```
[MqttService] Connected to MQTT broker
[MqttService] MQTT message device/Device1/sensor/data: {...}
```

## 📝 Muhim Eslatmalar

1. **Device Name Mosligi:**
   - Backend da yaratilgan device name ESP32 dagi `deviceName` bilan to'liq mos kelishi kerak
   - Masalan: Backend da `Device1` bo'lsa, ESP32 da ham `Device1` bo'lishi kerak

2. **MQTT Topic Format:**
   - Device-specific: `device/{deviceName}/sensor/data`
   - Global (backward compatibility): `sensor/data`

3. **WiFi Sozlamalari:**
   - ESP32 va Backend bir xil tarmoqda bo'lishi kerak
   - MQTT broker IP manzili to'g'ri bo'lishi kerak

4. **Port Sozlamalari:**
   - MQTT: 1883 (default)
   - Backend: 5001 (default)
   - Admin Panel: 3000 (default)
   - User Frontend: 3001 (default)

## 🐛 Muammolarni Hal Qilish

### ESP32 MQTT ga ulanmayapti

1. WiFi ulanishini tekshiring
2. MQTT broker IP manzilini tekshiring
3. MQTT broker ishlamoqdamimi tekshiring:
   ```bash
   mosquitto_sub -h localhost -t "test" -v
   ```

### Backend MQTT ma'lumotlarni qabul qilmayapti

1. Backend `.env` faylida `MQTT_BROKER_URL` to'g'ri ekanligini tekshiring
2. MQTT broker ishlamoqdamimi tekshiring
3. Backend console da xatoliklarni ko'ring

### Device Status "OFFLINE" ko'rsatilmoqda

1. ESP32 har 30 soniyada status yuboradi
2. ESP32 Serial Monitor da status yuborilayotganini tekshiring
3. MQTT topic to'g'ri ekanligini tekshiring

## 📊 Data Flow Diagram

```
ESP32 → MQTT Broker → Backend → Database
         ↓
    device/Device1/sensor/data
    device/Device1/status

Backend → MQTT Broker → ESP32
         ↓
    device/Device1/motor/command
    device/Device1/timer/command
    device/Device1/height/command
```

## ✅ Checklist

- [ ] Admin login qildi
- [ ] User yaratildi
- [ ] User login qildi
- [ ] Device yaratildi (name eslab qolindi)
- [ ] ESP32 kodida WiFi sozlandi
- [ ] ESP32 kodida MQTT broker IP sozlandi
- [ ] ESP32 kodida device name backend bilan moslashtirildi
- [ ] ESP32 kodida device location sozlandi
- [ ] ESP32 kod yuklandi
- [ ] MQTT broker ishga tushirildi
- [ ] Backend `.env` da MQTT sozlamalari qo'shildi
- [ ] Backend ishga tushirildi
- [ ] ESP32 Serial Monitor da "Connected" xabari ko'rinmoqda
- [ ] User Frontend da device "ONLINE" ko'rsatilmoqda
- [ ] Real-time ma'lumotlar ko'rinmoqda
- [ ] Motor control ishlayapti

---

**Yaratilgan:** 2024  
**Versiya:** 2.0.0

