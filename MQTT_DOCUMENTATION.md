# MQTT Protocol Documentation

## Umumiy ma'lumot

Bu loyiha ESP32 qurilmalari va backend server o'rtasida MQTT protokoli orqali real-time ma'lumot almashish uchun ishlatiladi.

## MQTT Broker Sozlamalari

- **Broker URL**: `MQTT_BROKER_URL` environment variable orqali sozlanadi
- **Port**: 1883 (default)
- **Username/Password**: `MQTT_USERNAME` va `MQTT_PASSWORD` orqali (ixtiyoriy)

## Topic Strukturasi

### 1. Device-Specific Topics (Tavsiya etiladi)

Har bir qurilma o'z nomiga ega va shu nom asosida topic'lar yaratiladi.

#### Format: `device/{deviceName}/{command|data}`

**Misol**: Agar qurilma nomi `ESP32Controller` bo'lsa:

- `device/ESP32Controller/motor/command`
- `device/ESP32Controller/timer/command`
- `device/ESP32Controller/sensor/data`
- `device/ESP32Controller/status`

### 2. Global Topics (Backward Compatibility)

Eski versiyalar bilan moslik uchun global topic'lar ham qo'llab-quvvatlanadi:

- `motor/command`
- `timer/command`
- `sensor/data`
- `device/status`

---

## Topic'lar va Payload'lar

### 📤 Backend → ESP32 (Commands)

#### 1. Motor Control

**Topic**: `device/{deviceName}/motor/command`  
**Payload**:

- `"ON"` - Motor yoqish
- `"OFF"` - Motor o'chirish

**Qo'shimcha**: Global topic `motor/command` ham qo'llab-quvvatlanadi.

**Misol**:

```javascript
// Backend kodida
mqttService.publishMotor('ESP32Controller', 'ON');
// Topic: device/ESP32Controller/motor/command
// Payload: ON
```

---

#### 2. Timer Command

**Topic**: `device/{deviceName}/timer/command`  
**Payload**: Sekundlarda timer vaqti (raqam, string sifatida)

**Misol**:

```javascript
// 5 daqiqa = 300 soniya
mqttService.publishTimer('ESP32Controller', 300);
// Topic: device/ESP32Controller/timer/command
// Payload: 300
```

**ESP32'da qayta ishlash**:

- ESP32 payload'ni soniga aylantiradi: `msg.toInt()`
- Millisekundlarga o'tkazadi: `timerDuration = timerSeconds * 1000`
- Timer'ni faollashtiradi va motor'ni yoqadi

---

#### 3. Height Control

**Topic**: `device/{deviceName}/height/command`  
**Payload**: Suv balandligi (cm, raqam)

**Misol**:

```javascript
mqttService.publishHeight('ESP32Controller', 150);
// Topic: device/ESP32Controller/height/command
// Payload: 150
```

**Ishlash prinsipi**:

- Agar `height > waterDepth` bo'lsa, motor avtomatik yoqiladi
- Agar `height <= waterDepth` bo'lsa, motor o'chadi

---

#### 4. Motor Switch

**Topic**: `device/{deviceName}/motor/switch`  
**Payload**:

- `"1"` - Motor 1 ni ishlatish
- `"2"` - Motor 2 ni ishlatish

**Misol**:

```javascript
mqttService.publishMotorSwitch('ESP32Controller', '2');
// Topic: device/ESP32Controller/motor/switch
// Payload: 2
```

**Ishlash prinsipi**:

- Motor 1 xatolik bo'lsa, avtomatik Motor 2 ga o'tadi
- Yoki qo'lda almashtirish mumkin

---

#### 5. Language Command

**Topic**: `device/{deviceName}/language/command`  
**Payload**:

- `"uz"` - O'zbek tili
- `"en"` - Ingliz tili
- `"ru"` - Rus tili

**Misol**:

```javascript
mqttService.publishLanguage('ESP32Controller', 'uz');
// Topic: device/ESP32Controller/language/command
// Payload: uz
```

**Ishlash prinsipi**:

- ESP32 TFT ekranda ko'rsatiladigan matnlarni o'zgartiradi
- Foydalanuvchi tilini ESP32'ga sinxronlashtiradi

---

### 📥 ESP32 → Backend (Data)

#### 1. Sensor Data

**Topic**: `device/{deviceName}/sensor/data`  
**Payload**: JSON formatida

```json
{
  "deviceName": "ESP32Controller",
  "location": "Toshkent",
  "waterDepth": 120,
  "height": 150,
  "totalLitres": 1250.5,
  "totalElectricity": 15.75,
  "motorState": "ON",
  "timerActive": true,
  "timerDuration": 240
}
```

**Maydonlar**:

- `deviceName` (string): Qurilma nomi
- `location` (string): Qurilma joylashuvi
- `waterDepth` (number): Suv chuqurligi (cm)
- `height` (number): Maqsadli balandlik (cm)
- `totalLitres` (number): Jami suv sarfi (litr)
- `totalElectricity` (number): Jami tok sarfi (kWh)
- `motorState` (string): `"ON"` yoki `"OFF"`
- `timerActive` (boolean): Timer faolmi?
- `timerDuration` (number, optional): Timer qolgan vaqti (sekundlarda, faqat `timerActive: true` bo'lsa)

**Yuborish chastotasi**: Har 1 soatda bir marta (3600000 ms)

**Qo'shimcha**: Global topic `sensor/data` ham qo'llab-quvvatlanadi.

---

#### 2. Device Status

**Topic**: `device/{deviceName}/status`  
**Payload**:

- `"online"` - Qurilma online
- `"offline"` - Qurilma offline

**Yuborish chastotasi**:

- Birinchi ulanishda bir marta
- Keyin har 30 soniyada bir marta

**Qo'shimcha**: Global topic `device/status` ham qo'llab-quvvatlanadi.

**Misol**:

```
Topic: device/ESP32Controller/status
Payload: online
```

---

## Timer Mexanizmi

### Timer O'rnatish

1. **Frontend → Backend**:

   - POST `/api/v1/devices/:id/command`
   - Body: `{ "timer": 300 }` (sekundlarda)

2. **Backend → ESP32**:

   - Topic: `device/{deviceName}/timer/command`
   - Payload: `"300"`

3. **ESP32 qayta ishlash**:
   ```cpp
   timerDuration = 300 * 1000;  // Millisekundlarga
   timerEndTime = millis() + timerDuration;
   timerActive = true;
   motorNew = true;  // Motor yoqiladi
   ```

### Timer Tugashi

1. **ESP32'da**:

   ```cpp
   if (timerActive && millis() >= timerEndTime) {
     timerActive = false;
     motorNew = false;
     motorState = "OFF";
     publishData();      // Status yuborish
     publishStatus("online");
   }
   ```

2. **Backend'da** (Cron job, har sekundda):
   - Timer tugagan qurilmalarni topadi
   - Motor'ni OFF qiladi
   - MQTT orqali OFF buyrug'ini yuboradi
   - WebSocket orqali frontend'ga xabar yuboradi

---

## Tok Sarfi Hisoblash

### ESP32'da

```cpp
float powerWatts = pzem.power();  // PZEM004T sensor orqali
if (!isnan(powerWatts))
  totalElectricity = round((powerWatts / 1000.0) * 100.0) / 100.0;
```

**Izoh**:

- `powerWatts` - hozirgi quvvat (Watt)
- `totalElectricity` - jami tok sarfi (kWh)
- Har soatda bir marta `sensor/data` orqali backend'ga yuboriladi

### Backend'da

1. **Har soatda** (Cron: `0 * * * *`):

   - Barcha ONLINE qurilmalar uchun
   - `totalElectricity` qiymatini `EnergyConsumption` collection'ga saqlaydi
   - Har bir user uchun alohida saqlanadi

2. **Hisobotlar**:
   - Kunlik: `/api/v1/reports/daily?date=YYYY-MM-DD`
   - Haftalik: `/api/v1/reports/weekly?weekStart=YYYY-MM-DD`
   - Oylik: `/api/v1/reports/monthly?month=YYYY-MM`
   - Yillik: `/api/v1/reports/yearly?year=YYYY`

---

## Xatoliklar va Qayta Ulanish

### ESP32

- Agar MQTT broker'ga ulanib bo'lmasa:
  - Har 5 soniyada qayta urinadi
  - `reconnect()` funksiyasi chaqiriladi

### Backend

- Agar MQTT client ulanib bo'lmasa:
  - Logger orqali xatolik yoziladi
  - MQTT funksiyalari ishlamaydi, lekin boshqa funksiyalar ishlaydi

---

## Qo'shimcha Ma'lumotlar

### Wildcard Subscription

Backend barcha qurilmalar uchun wildcard subscription qiladi:

```javascript
client.subscribe(['device/+/sensor/data', 'device/+/status']);
```

Bu orqali barcha qurilmalardan kelgan ma'lumotlarni qabul qiladi.

### QoS Levels

Hozirgi vaqtda QoS 0 ishlatiladi (at-most-once delivery).  
Kelajakda muhim buyruqlar uchun QoS 1 yoki 2 ishlatish mumkin.

---

## Misollar

### Motor Yoqish

```javascript
// Backend
mqttService.publishMotor('ESP32Controller', 'ON');
// Topic: device/ESP32Controller/motor/command
// Payload: ON
```

### Timer O'rnatish (10 daqiqa)

```javascript
// Backend
mqttService.publishTimer('ESP32Controller', 600);
// Topic: device/ESP32Controller/timer/command
// Payload: 600
```

### Sensor Ma'lumotlarini Qabul Qilish

```json
// ESP32 yuboradi
{
  "deviceName": "ESP32Controller",
  "waterDepth": 120,
  "totalElectricity": 15.75,
  "motorState": "ON"
}
```

---

## Xavfsizlik

1. **Authentication**: MQTT username/password (ixtiyoriy)
2. **Topic Isolation**: Har bir qurilma o'z topic'iga ega
3. **Validation**: Backend barcha payload'larni tekshiradi
4. **Error Handling**: Xatoliklar logger orqali yoziladi

---

## Test Qilish

### MQTT Client orqali test qilish

1. **Mosquitto CLI**:

```bash
# Subscribe
mosquitto_sub -h localhost -t "device/+/sensor/data" -v

# Publish
mosquitto_pub -h localhost -t "device/ESP32Controller/motor/command" -m "ON"
```

2. **MQTT Explorer** (GUI):
   - Broker'ga ulaning
   - Topic'larni kuzating
   - Payload'larni yuborish va qabul qilish

---

## Versiya Tarixi

- **v1.0**: Asosiy funksiyalar (motor, timer, sensor data)
- **v1.1**: Device-specific topics qo'shildi
- **v1.2**: Language command qo'shildi
- **v1.3**: Motor switch qo'shildi
- **v1.4**: Timer tugaganda avtomatik status yuborish

---

## Yordam

Agar muammo bo'lsa:

1. MQTT broker ishlayotganini tekshiring
2. Network ulanishini tekshiring
3. Topic va payload formatini tekshiring
4. Logger xabarlarini ko'rib chiqing
