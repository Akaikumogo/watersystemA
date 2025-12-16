# Yangi Feature'lar - Xulosa

## ✅ Qo'shilgan Feature'lar

### 1. Ultrasonic Mode (Auto/Manual)

- **Backend**: Device schema'ga `ultrasonic: boolean` field qo'shildi
- **ESP32**: Ultrasonic mode'ni qo'llab-quvvatlaydi
  - `ultrasonic: true` - Avtomatik ishlaydi (height va waterDepth asosida motor yoqiladi/o'chadi)
  - `ultrasonic: false` - Faqat manual (timer va motor command orqali)
- **MQTT Topic**: `device/{deviceName}/ultrasonic/command`
- **Frontend**: Ultrasonic mode toggle qo'shish kerak

### 2. Motor Online/Offline Status

- **Backend**: Device schema'ga `motorOnline: boolean` field qo'shildi
- **ESP32**: Motor online statusini har safar publish qiladi
- **Frontend**: Motor offline bo'lsa, barcha action'lar disabled bo'ladi

### 3. ESP32 Backend'dan Sozlamalarni Olish

- **Backend**: ESP32 yonganda (BOOT event) avtomatik sozlamalarni yuboradi:
  - `height` (balandlik)
  - `activeMotor2` (qaysi motor ishlashi kerak)
  - `ultrasonic` (ultrasonic mode)
- **MQTT**: `publishDeviceSettings()` funksiyasi orqali

### 4. ESP32 Default Holati

- ESP32 yonganda by default o'chik holda bo'ladi
- Timer o'rnatilgan paytida ESP o'chib qolsa, timer ham o'chadi
- Action'lar 0 holatiga keladi, lekin sozlamalar (height, activeMotor2) saqlanadi

---

## 📝 O'zgarishlar Ro'yxati

### Backend

1. **Device Schema** (`device.schema.ts`):

   - `ultrasonic: boolean` (default: true)
   - `motorOnline: boolean` (default: false)

2. **DeviceCommandDto** (`device-command.dto.ts`):

   - `ultrasonic?: boolean` field qo'shildi

3. **UpdateDeviceDto** (`update-device.dto.ts`):

   - `ultrasonic?: boolean` field qo'shildi
   - `motorOnline?: boolean` field qo'shildi

4. **MQTT Service** (`mqtt.service.ts`):

   - `publishUltrasonic()` funksiyasi qo'shildi
   - `publishDeviceSettings()` funksiyasi qo'shildi
   - `SensorPayload` type'ga `motorOnline?: boolean` qo'shildi

5. **Devices Service** (`devices.service.ts`):
   - `SensorSnapshot` type'ga `motorOnline?: boolean` qo'shildi
   - `upsertSensorSnapshot()` da `motorOnline` field qo'shildi
   - `sendCommand()` da `ultrasonic` command qo'llab-quvvatlanadi
   - ESP32 yonganda sozlamalar yuboriladi

### ESP32

1. **O'zgaruvchilar**:

   - `ultrasonicMode: bool` (default: true)
   - `motorOnline: bool` (default: true)
   - `ultrasonicCommandTopic: String`

2. **MQTT Topics**:

   - Subscribe: `device/{deviceName}/ultrasonic/command`

3. **Logic**:

   - `updateLogic()` da ultrasonic mode tekshiriladi
   - Ultrasonic mode false bo'lsa, faqat manual va timer ishlaydi
   - Default o'chik holat (motorState = "OFF")
   - Timer tugaganda motor o'chadi va timer o'chadi

4. **Publish**:
   - `motorOnline` status har safar yuboriladi

### Frontend

1. **Types** (`types/index.ts`):

   - `Device` interface'ga `ultrasonic?: boolean` qo'shildi
   - `Device` interface'ga `motorOnline?: boolean` qo'shildi

2. **API** (`api.ts`):

   - `sendDeviceCommand()` ga `ultrasonic?: boolean` field qo'shildi

3. **DeviceDetail Page** (qo'shish kerak):
   - Ultrasonic mode toggle
   - Motor offline bo'lsa, barcha action'lar disabled
   - UI ko'rsatkichlari

---

## 🎯 Keyingi Qadamlar

### Frontend (DeviceDetail.tsx)

1. **Ultrasonic Mode Toggle**:

```tsx
<Checkbox
  isSelected={device.ultrasonic}
  onValueChange={(value) => {
    api.sendDeviceCommand(id, { ultrasonic: value });
  }}
  isDisabled={!device.motorOnline || isSendingCommand}
>
  {t('device.ultrasonicMode')}
</Checkbox>
```

2. **Motor Offline Disabled Logic**:

```tsx
const isDisabled = !device.motorOnline || isSendingCommand || isListening

<Button
  onPress={() => handleMotorCommand('ON')}
  isDisabled={isDisabled}
>
  {t('device.motorOn')}
</Button>
```

3. **Motor Offline UI Indicator**:

```tsx
{
  !device.motorOnline && (
    <Chip color="danger" variant="flat">
      {t('device.motorOffline')}
    </Chip>
  );
}
```

---

## 📊 Data Flow

### Ultrasonic Mode Toggle

```
Frontend → REST API → Backend (DevicesService)
→ MQTT (device/{deviceName}/ultrasonic/command)
→ ESP32 (mqttCallback)
→ ESP32 (ultrasonicMode = true/false)
→ ESP32 (publishState)
→ Backend → WebSocket → Frontend
```

### Motor Online Status

```
ESP32 → MQTT (device/{deviceName}/sensor/data, motorOnline: true/false)
→ Backend (MqttService)
→ Backend (DevicesService.upsertSensorSnapshot)
→ Backend (WebSocket emitDeviceUpdate)
→ Frontend (real-time update)
```

### ESP32 Settings on Boot

```
ESP32 (BOOT) → MQTT (device/{deviceName}/sensor/data, motorState: "OFF")
→ Backend (DevicesService.upsertSensorSnapshot)
→ Backend (publishDeviceSettings)
→ MQTT (height/command, motor/switch, ultrasonic/command)
→ ESP32 (mqttCallback)
```

---

## ✅ Test Qilish

1. **Ultrasonic Mode Test**:

   - Frontend'da ultrasonic mode toggle'ni test qilish
   - ESP32 Serial Monitor'da ultrasonic command qabul qilinganini tekshirish
   - Ultrasonic false bo'lganda avtomatik motor o'chilishini tekshirish

2. **Motor Online Status Test**:

   - ESP32 dan motorOnline status yuborilayotganini tekshirish
   - Frontend'da motor offline bo'lganda action'lar disabled bo'lishini tekshirish

3. **ESP32 Settings on Boot Test**:
   - ESP32 ni qayta ishga tushirish
   - Backend'dan sozlamalar yuborilayotganini tekshirish
   - ESP32 da sozlamalar to'g'ri o'rnatilganini tekshirish

---

**Yaratilgan:** 2024  
**Versiya:** 2.0
