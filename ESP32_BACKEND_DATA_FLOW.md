# ESP32 → Backend Ma'lumotlar Oqimi va Hisobot Tizimi

## Umumiy Ma'lumot

ESP32 qurilmalari MQTT protokoli orqali backend server'ga real-time sensor ma'lumotlarini yuboradi. Backend bu ma'lumotlarni qabul qilib, saqlaydi va hisobotlar uchun ishlatadi.

---

## ESP32 Yuboradigan Ma'lumotlar

### 1. Sensor Data (Har 1 soatda bir marta)

**Topic**: `device/{deviceName}/sensor/data`  
**Format**: JSON

**Payload Strukturasi**:

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

**Maydonlar Tafsiloti**:

| Maydon             | Type              | Izoh                                                               |
| ------------------ | ----------------- | ------------------------------------------------------------------ |
| `deviceName`       | string            | Qurilma nomi (ESP32'da sozlanadi)                                  |
| `location`         | string            | Qurilma joylashuvi                                                 |
| `waterDepth`       | number            | Suv chuqurligi (cm) - HC-SR04 sensor                               |
| `height`           | number            | Maqsadli balandlik (cm) - Backend'dan o'rnatiladi                  |
| `totalLitres`      | number            | Jami suv sarfi (litr) - Flow sensor                                |
| `totalElectricity` | number            | Jami tok sarfi (kWh) - PZEM004T sensor                             |
| `motorState`       | string            | `"ON"` yoki `"OFF"`                                                |
| `timerActive`      | boolean           | Timer faolmi?                                                      |
| `timerDuration`    | number (optional) | Timer qolgan vaqti (sekundlarda, faqat `timerActive: true` bo'lsa) |

**Yuborish Chastotasi**: Har 1 soatda bir marta (3600000 ms)

**ESP32 Kodida**:

```cpp
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

  client.publish(sensorTopic.c_str(), payload.c_str());
}
```

---

### 2. Device Status (Har 30 soniyada bir marta)

**Topic**: `device/{deviceName}/status`  
**Payload**: `"online"` yoki `"offline"`

**Maqsad**: Qurilma online/offline holatini backend'ga bildirish

**Yuborish Chastotasi**:

- Birinchi ulanishda bir marta
- Keyin har 30 soniyada bir marta

---

## Backend'da Qabul Qilish va Saqlash

### 1. MQTT Service (Qabul Qilish)

**Fayl**: `smart_water_backend/src/modules/mqtt/mqtt.service.ts`

```typescript
private handleSensorMessage(message: string) {
  if (!message) return;
  try {
    const data = JSON.parse(message) as SensorPayload;
    void this.devicesService.upsertSensorSnapshot({
      deviceName: data.deviceName,
      location: data.location,
      waterDepth: this.toNumber(data.waterDepth),
      height: this.toNumber(data.height),
      totalLitres: this.toNumber(data.totalLitres),
      totalElectricity: this.toNumber(data.totalElectricity),
      motorState: data.motorState,
      timerActive: Boolean(data.timerActive)
    });
  } catch (error) {
    this.logger.error('Failed to parse sensor payload', error);
  }
}
```

---

### 2. Devices Service (Saqlash)

**Fayl**: `smart_water_backend/src/modules/devices/devices.service.ts`

**Funksiya**: `upsertSensorSnapshot()`

```typescript
async upsertSensorSnapshot(snapshot: SensorSnapshot) {
  // 1. Device'ni topish yoki yaratish
  let device = await this.deviceModel.findOne({
    name: snapshot.deviceName
  }).lean();

  if (!device) {
    // Yangi device yaratish
    device = await this.deviceModel.create({
      name: snapshot.deviceName,
      location: snapshot.location || 'Unknown',
      status: 'ONLINE',
      waterDepth: snapshot.waterDepth ?? 0,
      height: snapshot.height ?? 0,
      totalLitres: snapshot.totalLitres ?? 0,
      totalElectricity: snapshot.totalElectricity ?? 0,
      motorState: snapshot.motorState || 'OFF',
      timerActive: snapshot.timerActive ?? false
    });
  } else {
    // Mavjud device'ni yangilash
    await this.deviceModel.findByIdAndUpdate(
      device._id,
      {
        $set: {
          status: 'ONLINE',
          lastUpdated: new Date(),
          waterDepth: snapshot.waterDepth ?? device.waterDepth,
          height: snapshot.height ?? device.height,
          totalLitres: snapshot.totalLitres ?? device.totalLitres,
          totalElectricity: snapshot.totalElectricity ?? device.totalElectricity,
          motorState: snapshot.motorState ?? device.motorState,
          timerActive: snapshot.timerActive ?? device.timerActive,
          timerDuration: snapshot.timerActive ?
            (snapshot.timerDuration ?? device.timerDuration) : 0
        }
      },
      { new: true }
    );
  }

  // 2. WebSocket orqali real-time yangilanish
  if (this.devicesGateway) {
    this.devicesGateway.emitDeviceUpdate(device);
  }
}
```

**Saqlanadigan Ma'lumotlar**:

- `Device` collection'ga saqlanadi
- Har bir sensor data kelganda yangilanadi
- Real-time frontend'ga WebSocket orqali yuboriladi

---

## Hisobot Tizimi

### 1. Hourly Energy Consumption Saqlash

**Fayl**: `smart_water_backend/src/modules/devices/devices.service.ts`

**Cron Job**: Har soatda bir marta (`0 * * * *`)

```typescript
@Cron('0 * * * *') // Every hour at minute 0
async saveHourlyEnergyConsumption() {
  try {
    const devices = await this.deviceModel.find({ status: 'ONLINE' }).lean();

    for (const device of devices) {
      const deviceId = device._id.toString();
      const userIds = device.userIds || [];

      // Har bir user uchun alohida saqlash
      for (const userId of userIds) {
        if (this.reportsService) {
          await this.reportsService.saveHourlyConsumption(
            deviceId,
            userId,
            {
              energyUsed: device.totalElectricity ?? 0,  // kWh
              waterUsed: device.totalLitres ?? 0,         // Litres
              motorState: device.motorState ?? 'OFF',
              timerActive: device.timerActive ?? false
            }
          );
        }
      }
    }

    this.logger.log(`Saved hourly energy consumption data for ${devices.length} devices`);
  } catch (error) {
    this.logger.error('Failed to save hourly energy consumption', error);
  }
}
```

**Saqlanadigan Ma'lumotlar**:

- `EnergyConsumption` collection'ga saqlanadi
- Har bir user va device uchun alohida saqlanadi
- Timestamp: Har soatning boshi (00:00, 01:00, 02:00, ...)

**Schema**:

```typescript
{
  deviceId: string,      // Device ID
  userId: string,        // User ID
  timestamp: Date,       // Soat boshi (00:00, 01:00, ...)
  energyUsed: number,    // kWh
  waterUsed: number,     // Litres
  motorState: string,    // "ON" yoki "OFF"
  timerActive: boolean   // Timer faolmi?
}
```

---

### 2. Hisobotlar

**Fayl**: `smart_water_backend/src/modules/reports/reports.service.ts`

#### a) Kunlik Hisobot

**Endpoint**: `GET /api/v1/reports/daily?date=YYYY-MM-DD`

**Ma'lumotlar**:

- Barcha soatlardagi `energyUsed` va `waterUsed` yig'indisi
- Har bir device uchun alohida
- Jami energy va water

**Misol Response**:

```json
{
  "date": "2024-01-15",
  "devices": [
    {
      "deviceId": "...",
      "deviceName": "ESP32Controller",
      "deviceLocation": "Toshkent",
      "totalEnergy": 15.75,
      "totalWater": 1250.5,
      "hours": 24
    }
  ],
  "totalEnergy": 15.75,
  "totalWater": 1250.5
}
```

#### b) Haftalik Hisobot

**Endpoint**: `GET /api/v1/reports/weekly?weekStart=YYYY-MM-DD`

**Ma'lumotlar**:

- 7 kunlik ma'lumotlar
- Har bir kun uchun alohida
- Har bir device uchun alohida

#### c) Oylik Hisobot

**Endpoint**: `GET /api/v1/reports/monthly?month=YYYY-MM`

**Ma'lumotlar**:

- Oydagi barcha kunlar
- Har bir kun uchun alohida
- Har bir device uchun alohida

#### d) Yillik Hisobot

**Endpoint**: `GET /api/v1/reports/yearly?year=YYYY`

**Ma'lumotlar**:

- Yildagi barcha oylar
- Har bir oy uchun alohida
- Har bir device uchun alohida

---

## Ma'lumotlar Oqimi Diagrammasi

```
ESP32                          Backend                          Database
  │                              │                                │
  │  (Har 1 soatda)              │                                │
  ├─ publishData() ──────────────>│                                │
  │  (sensor/data)               │                                │
  │                               ├─ handleSensorMessage()        │
  │                               ├─ upsertSensorSnapshot()       │
  │                               │                                │
  │                               ├───────────────────────────────>│
  │                               │   Device collection update     │
  │                               │                                │
  │  (Har 30 soniyada)            │                                │
  ├─ publishStatus("online") ────>│                                │
  │  (status)                     ├─ updateStatus()                │
  │                               │                                │
  │                               │  (Har soatda - Cron)           │
  │                               ├─ saveHourlyEnergyConsumption()│
  │                               │                                │
  │                               ├───────────────────────────────>│
  │                               │   EnergyConsumption save       │
  │                               │                                │
  │                               │  (Hisobot so'rovlari)          │
  │                               │<───────────────────────────────┤
  │                               │   GET /reports/daily           │
  │                               │   GET /reports/weekly           │
  │                               │   GET /reports/monthly          │
  │                               │   GET /reports/yearly           │
  │                               │                                │
  │                               ├───────────────────────────────>│
  │                               │   Aggregate from               │
  │                               │   EnergyConsumption             │
```

---

## Muhim Eslatmalar

### 1. Tok Sarfi Hisoblash

**ESP32'da**:

```cpp
float powerWatts = pzem.power();  // Hozirgi quvvat (Watt)
if (!isnan(powerWatts))
  totalElectricity = round((powerWatts / 1000.0) * 100.0) / 100.0;
```

**Izoh**:

- `powerWatts` - hozirgi quvvat (Watt)
- `totalElectricity` - jami tok sarfi (kWh)
- **Muammo**: Bu faqat hozirgi quvvatni ko'rsatadi, jami sarfni emas!

**Yaxshilash** (Kelajakda):

- Har sekundda quvvatni o'lchash
- Vaqtga ko'paytirish: `energy = power * time`
- Jami sarfni hisoblash

### 2. Suv Sarfi Hisoblash

**ESP32'da**:

```cpp
float flowRate = (pulseCount / 7.5);  // Litr/daqiqa
totalLitres += flowRate / 60.0;       // Har sekundda
pulseCount = 0;
```

**Izoh**:

- Flow sensor har sekundda pulse'lar sonini o'lchaydi
- `7.5 pulse = 1 litr` (kalibratsiya)
- Jami sarf qo'shib boriladi

### 3. Hisobotlar Uchun Ma'lumotlar

**Kerakli Ma'lumotlar**:

- ✅ `totalElectricity` (kWh) - Tok sarfi
- ✅ `totalLitres` (L) - Suv sarfi
- ✅ `motorState` - Motor holati
- ✅ `timerActive` - Timer holati
- ✅ `timestamp` - Vaqt

**Saqlash**:

- Har soatda bir marta `EnergyConsumption` collection'ga
- Har bir user va device uchun alohida
- Hisobotlar uchun aggregate qilinadi

---

## API Endpoint'lar

### 1. Sensor Data Qabul Qilish

**MQTT Topic**: `device/{deviceName}/sensor/data`  
**Backend Handler**: `MqttService.handleSensorMessage()`  
**Saqlash**: `DevicesService.upsertSensorSnapshot()`

### 2. Status Qabul Qilish

**MQTT Topic**: `device/{deviceName}/status`  
**Backend Handler**: `MqttService.handleStatusMessage()`  
**Saqlash**: `DevicesService.updateStatus()`

### 3. Hisobotlar

**Kunlik**: `GET /api/v1/reports/daily?date=YYYY-MM-DD`  
**Haftalik**: `GET /api/v1/reports/weekly?weekStart=YYYY-MM-DD`  
**Oylik**: `GET /api/v1/reports/monthly?month=YYYY-MM`  
**Yillik**: `GET /api/v1/reports/yearly?year=YYYY`

---

## Xulosa

ESP32 quyidagi ma'lumotlarni backend'ga yuboradi:

1. **Sensor Data** (har 1 soatda):

   - `deviceName`, `location`
   - `waterDepth`, `height`
   - `totalLitres`, `totalElectricity`
   - `motorState`, `timerActive`, `timerDuration`

2. **Status** (har 30 soniyada):
   - `"online"` yoki `"offline"`

Backend bu ma'lumotlarni:

- `Device` collection'ga saqlaydi (real-time)
- `EnergyConsumption` collection'ga saqlaydi (har soatda, hisobotlar uchun)
- Frontend'ga WebSocket orqali yuboradi (real-time)

Hisobotlar `EnergyConsumption` collection'dan aggregate qilinadi.
