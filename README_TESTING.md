# Testing va Monitoring Qo'llanmasi

## 🚀 Tez Boshlash

### 1. MQTT Topic'larni Kuzatish

```bash
# Sensor data'ni kuzatish
./scripts/test-mqtt.sh

# Yoki to'g'ridan-to'g'ri
mosquitto_sub -h 185.217.131.96 -p 1883 -u tr12345678 -P tr12345678 \
  -t "device/qaysiddurboshcka/sensor/data" -v
```

### 2. Command Yuborish

```bash
# Motor ON
./scripts/send-mqtt-command.sh motor ON

# Motor OFF
./scripts/send-mqtt-command.sh motor OFF

# Timer (5 daqiqa = 300 soniya)
./scripts/send-mqtt-command.sh timer 300

# Height (150 cm)
./scripts/send-mqtt-command.sh height 150

# Motor switch (Motor 2)
./scripts/send-mqtt-command.sh switch 2
```

## 📋 Batafsil Qo'llanma

Batafsil test qo'llanmasi uchun `TESTING_GUIDE.md` faylini ko'ring.

## 🔧 Skriptlar

### test-mqtt.sh

MQTT broker ulanishini va sensor data topic'ini kuzatish uchun.

### send-mqtt-command.sh

ESP32 ga command yuborish uchun.

## 📊 Monitoring

### Real-time Monitoring

1. **MQTT Monitoring:**

   ```bash
   mosquitto_sub -h 185.217.131.96 -p 1883 -u tr12345678 -P tr12345678 \
     -t "device/+/#" -v
   ```

2. **Backend Logs:**

   ```bash
   cd smart_water_backend
   npm run start:dev
   ```

3. **ESP32 Serial Monitor:**
   - Arduino IDE → Tools → Serial Monitor
   - Baud rate: 115200

## ✅ Test Checklist

- [ ] MQTT broker ulanishi
- [ ] ESP32 WiFi ulanishi
- [ ] ESP32 MQTT ulanishi
- [ ] Sensor data publishing
- [ ] Command receiving
- [ ] Backend data processing
- [ ] WebSocket real-time updates
- [ ] Frontend real-time updates

---

**Yaratilgan:** 2024  
**Versiya:** 1.0
