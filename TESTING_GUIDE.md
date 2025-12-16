# Water System - Test Qilish Qo'llanmasi

## 📋 Umumiy Ko'rinish

Bu qo'llanmada barcha komponentlarni test qilish bo'yicha batafsil ko'rsatmalar keltirilgan.

---

## 🔧 Test Qilish Oldidan Tayyorgarlik

### 1. MQTT Broker Tekshiruvi

```bash
# MQTT broker ishlamoqdamimi tekshirish
mosquitto_sub -h 185.217.131.96 -p 1883 -u tr12345678 -P tr12345678 -t "test" -v

# Agar xabar ko'rsatmasa, broker ishlamayapti
```

### 2. Backend Sozlamalari

Backend `.env` faylida quyidagilar bo'lishi kerak:

```env
MQTT_BROKER_URL=mqtt://185.217.131.96:1883
MQTT_USERNAME=tr12345678
MQTT_PASSWORD=tr12345678
```

### 3. ESP32 Sozlamalari

ESP32 kodida quyidagilar to'g'ri sozlanganligini tekshiring:

```cpp
const char* mqttServer = "185.217.131.96";
const int mqttPort = 1883;
const char* mqttUser = "tr12345678";
const char* mqttPass = "tr12345678";
String deviceName = "qaysiddurboshcka"; // Backend bilan mos kelishi kerak
```

---

## 🧪 Test Qadamlari

### 1. MQTT Topic'larni Kuzatish

#### Sensor Data Topic'ini Kuzatish

```bash
# Barcha device'lardan kelgan sensor data'ni kuzatish
mosquitto_sub -h 185.217.131.96 -p 1883 -u tr12345678 -P tr12345678 \
  -t "device/+/sensor/data" -v

# Muayyan device uchun
mosquitto_sub -h 185.217.131.96 -p 1883 -u tr12345678 -P tr12345678 \
  -t "device/qaysiddurboshcka/sensor/data" -v
```

**Kutilayotgan natija:**

```json
{
  "deviceName": "qaysiddurboshcka",
  "waterDepth": 120,
  "height": 150,
  "motorState": "ON",
  "timerActive": false,
  "totalLitres": 1250.5,
  "totalElectricity": 15.75
}
```

#### Command Topic'larini Kuzatish

```bash
# Motor command'ni kuzatish
mosquitto_sub -h 185.217.131.96 -p 1883 -u tr12345678 -P tr12345678 \
  -t "device/qaysiddurboshcka/motor/command" -v

# Timer command'ni kuzatish
mosquitto_sub -h 185.217.131.96 -p 1883 -u tr12345678 -P tr12345678 \
  -t "device/qaysiddurboshcka/timer/command" -v

# Height command'ni kuzatish
mosquitto_sub -h 185.217.131.96 -p 1883 -u tr12345678 -P tr12345678 \
  -t "device/qaysiddurboshcka/height/command" -v

# Motor switch command'ni kuzatish
mosquitto_sub -h 185.217.131.96 -p 1883 -u tr12345678 -P tr12345678 \
  -t "device/qaysiddurboshcka/motor/switch" -v
```

### 2. ESP32 Test Qilish

#### Serial Monitor'da Tekshirish

ESP32 Serial Monitor'da (115200 baud) quyidagi xabarlarni ko'rish kerak:

```
WiFi connected!
IP: 192.168.1.50
Connecting to MQTT...
Connected to MQTT broker
Subscribed to: device/qaysiddurboshcka/motor/command
Subscribed to: device/qaysiddurboshcka/timer/command
Subscribed to: device/qaysiddurboshcka/height/command
Subscribed to: device/qaysiddurboshcka/motor/switch
```

#### Sensor Data Publishing Test

Har 1 soniyada quyidagi xabar ko'rinishi kerak:

```
Published to: device/qaysiddurboshcka/sensor/data
Payload: {"deviceName":"qaysiddurboshcka",...}
```

### 3. Backend Test Qilish

#### MQTT Connection Tekshiruvi

Backend console'da quyidagi xabarlarni ko'rish kerak:

```
[MqttService] Connected to MQTT broker
[MqttService] MQTT message device/qaysiddurboshcka/sensor/data: {...}
[MqttService] Processed sensor data for device: qaysiddurboshcka
```

#### WebSocket Connection Tekshiruvi

Backend console'da WebSocket connection'lar:

```
[DevicesGateway] Client abc123 connected (user: username)
[DevicesGateway] Device update emitted: 507f1f77bcf86cd799439011
```

### 4. Frontend Test Qilish

#### WebSocket Connection

Browser console'da:

```javascript
// WebSocket connected
WebSocket connected
WebSocket server confirmed connection: {message: "Connected to WebSocket server"}
```

#### Real-time Updates

Browser console'da device update'lar:

```javascript
// Device update received
Device update: {_id: "...", name: "qaysiddurboshcka", motorState: "ON", ...}
```

---

## 🎯 Command Test Qilish

### 1. Motor ON/OFF Test

#### Frontend orqali:

1. Device detail page ga kiring
2. Motor ON/OFF tugmasini bosing
3. ESP32 Serial Monitor'da quyidagi xabarni ko'ring:

```
Received command: device/qaysiddurboshcka/motor/command
Payload: ON
Motor state changed to: ON
```

#### MQTT orqali to'g'ridan-to'g'ri:

```bash
# Motor ON
mosquitto_pub -h 185.217.131.96 -p 1883 -u tr12345678 -P tr12345678 \
  -t "device/qaysiddurboshcka/motor/command" -m "ON"

# Motor OFF
mosquitto_pub -h 185.217.131.96 -p 1883 -u tr12345678 -P tr12345678 \
  -t "device/qaysiddurboshcka/motor/command" -m "OFF"
```

### 2. Timer Test

```bash
# 5 daqiqa (300 soniya) timer
mosquitto_pub -h 185.217.131.96 -p 1883 -u tr12345678 -P tr12345678 \
  -t "device/qaysiddurboshcka/timer/command" -m "300"
```

ESP32 Serial Monitor'da:

```
Received command: device/qaysiddurboshcka/timer/command
Payload: 300
Timer started: 300 seconds
```

### 3. Height Test

```bash
# Height 150 cm ga o'rnatish
mosquitto_pub -h 185.217.131.96 -p 1883 -u tr12345678 -P tr12345678 \
  -t "device/qaysiddurboshcka/height/command" -m "150"
```

ESP32 Serial Monitor'da:

```
Received command: device/qaysiddurboshcka/height/command
Payload: 150
Height set to: 150 cm
```

### 4. Motor Switch Test

```bash
# Motor 2 ga o'tish
mosquitto_pub -h 185.217.131.96 -p 1883 -u tr12345678 -P tr12345678 \
  -t "device/qaysiddurboshcka/motor/switch" -m "2"

# Motor 1 ga qaytish
mosquitto_pub -h 185.217.131.96 -p 1883 -u tr12345678 -P tr12345678 \
  -t "device/qaysiddurboshcka/motor/switch" -m "1"
```

---

## 🔍 Data Flow Test

### 1. ESP32 → Backend Test

1. ESP32 sensor data publish qiladi
2. MQTT broker orqali backend ga yetib keladi
3. Backend database'ga saqlaydi
4. Backend WebSocket orqali frontend'ga yuboradi

**Tekshirish:**

- MQTT topic'da xabar ko'rinishi kerak
- Backend console'da "Processed sensor data" xabari
- Frontend'da real-time update

### 2. Frontend → ESP32 Test

1. Frontend command yuboradi (REST API)
2. Backend MQTT orqali ESP32 ga yuboradi
3. ESP32 command'ni qabul qiladi va bajaradi
4. ESP32 status update yuboradi
5. Backend WebSocket orqali frontend'ga yuboradi

**Tekshirish:**

- Backend console'da "Message published successfully"
- MQTT topic'da command ko'rinishi kerak
- ESP32 Serial Monitor'da command qabul qilingan
- Frontend'da status yangilangan

---

## 🐛 Muammolarni Hal Qilish

### ESP32 MQTT ga ulanmayapti

**Tekshirish:**

1. WiFi ulanishini tekshiring (Serial Monitor)
2. MQTT broker IP manzilini tekshiring
3. MQTT username/password to'g'riligini tekshiring
4. MQTT broker ishlamoqdamimi tekshiring

**Yechim:**

```cpp
// ESP32 kodida reconnect logic qo'shing
if (!client.connected()) {
  Serial.println("Reconnecting to MQTT...");
  connectMQTT();
}
```

### Backend MQTT ma'lumotlarni qabul qilmayapti

**Tekshirish:**

1. Backend `.env` faylida `MQTT_BROKER_URL` to'g'ri ekanligini tekshiring
2. Backend console'da "Connected to MQTT broker" xabari ko'rinishini tekshiring
3. MQTT topic'larni kuzatish orqali xabarlar kelayotganini tekshiring

**Yechim:**

```bash
# Backend log'larni ko'rish
cd smart_water_backend
npm run start:dev
# Console'da MQTT xabarlarini kuzating
```

### Frontend WebSocket ulanmayapti

**Tekshirish:**

1. Browser console'da xatoliklarni ko'ring
2. Backend WebSocket server ishlamoqdamimi tekshiring
3. JWT token to'g'ri ekanligini tekshiring

**Yechim:**

```javascript
// Browser console'da
socketManager.connect().then((socket) => {
  console.log('Socket connected:', socket.connected);
});
```

### Device Status "OFFLINE" ko'rsatilmoqda

**Tekshirish:**

1. ESP32 har 1 soniyada sensor data yuborayotganini tekshiring
2. MQTT topic'da xabarlar kelayotganini tekshiring
3. Backend'da device lastUpdated yangilanganini tekshiring

**Yechim:**

- ESP32 Serial Monitor'da publish xabarlarini tekshiring
- MQTT topic'ni kuzatish orqali xabarlar kelayotganini tasdiqlang

---

## 📊 Monitoring

### Real-time Monitoring

1. **MQTT Topic Monitoring:**

   ```bash
   # Barcha topic'larni kuzatish
   mosquitto_sub -h 185.217.131.96 -p 1883 -u tr12345678 -P tr12345678 \
     -t "device/+/#" -v
   ```

2. **Backend Log Monitoring:**

   ```bash
   cd smart_water_backend
   npm run start:dev | grep -E "(MQTT|WebSocket|Device)"
   ```

3. **Frontend Console Monitoring:**
   - Browser DevTools → Console
   - WebSocket events va device updates kuzatish

### Performance Monitoring

1. **MQTT Message Rate:**

   - ESP32 har 1 soniyada publish qiladi
   - Backend har 1 soniyada qabul qiladi
   - Frontend har 1 soniyada yangilanadi

2. **WebSocket Connection:**
   - Connection count
   - Message rate
   - Reconnection frequency

---

## ✅ Test Checklist

### ESP32

- [ ] WiFi ulanishi muvaffaqiyatli
- [ ] MQTT ulanishi muvaffaqiyatli
- [ ] Sensor data har 1 soniyada publish qilinmoqda
- [ ] Command'lar to'g'ri qabul qilinmoqda
- [ ] Motor control ishlayapti
- [ ] Timer control ishlayapti
- [ ] Height control ishlayapti
- [ ] Motor switch ishlayapti

### Backend

- [ ] MQTT broker ga ulanish muvaffaqiyatli
- [ ] Sensor data to'g'ri qabul qilinmoqda
- [ ] Database'ga to'g'ri saqlanmoqda
- [ ] Command'lar to'g'ri publish qilinmoqda
- [ ] WebSocket server ishlayapti
- [ ] Real-time update'lar emit qilinmoqda

### Frontend

- [ ] WebSocket connection muvaffaqiyatli
- [ ] Real-time update'lar qabul qilinmoqda
- [ ] Device list to'g'ri ko'rsatilmoqda
- [ ] Device control ishlayapti
- [ ] UI responsiv ishlayapti

### Integration

- [ ] ESP32 → Backend → Frontend data flow ishlayapti
- [ ] Frontend → Backend → ESP32 command flow ishlayapti
- [ ] Real-time update'lar to'g'ri ishlayapti
- [ ] Barcha feature'lar ishlayapti

---

**Yaratilgan:** 2024  
**Versiya:** 1.0
