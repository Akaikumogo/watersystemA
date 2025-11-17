# Versiya Solishtiruvchi Hujjat

## Birinchi versiya (AP + WebServer) vs Ikkinchi versiya (MQTT + Backend)

---

## ❌ Birinchi versiyada BOR, Ikkinchi versiyada YO'Q bo'lgan featurelar

### 1. **WiFi Access Point (AP) Rejimi**

**Birinchi versiya:**

- ESP32 o'zi Access Point sifatida ishlaydi
- SSID: `ESP32_WaterSystem`, Password: `water123`
- IP: `192.168.4.1` (avtomatik)
- Hech qanday WiFi router kerak emas
- To'g'ridan-to'g'ri ESP32ga ulanib boshqarish mumkin

**Ikkinchi versiya:**

- Faqat WiFi Station rejimi (routerga ulanadi)
- WiFi router kerak
- ESP32 o'zi AP sifatida ishlamaydi

**Foyda:** Birinchi versiyada internet va router bo'lmasa ham ishlaydi, to'g'ridan-to'g'ri ESP32ga ulanib boshqarish mumkin.

---

### 2. **Ichki WebServer (ESP32 ichida HTTP Server)**

**Birinchi versiya:**

- ESP32 ichida to'liq HTTP server
- Port 80 da ishlaydi
- 3 ta endpoint:
  - `GET /` - HTML sahifa qaytaradi
  - `GET /data` - JSON ma'lumotlar qaytaradi
  - `GET /command?motor=ON&height=100&timer=60` - Buyruqlar qabul qiladi

**Ikkinchi versiya:**

- WebServer yo'q
- Barcha boshqaruv backend orqali

**Foyda:** Birinchi versiyada ESP32 mustaqil ishlaydi, backend kerak emas.

---

### 3. **HTML Sahifa ESP32 Ichida (Embedded Web Interface)**

**Birinchi versiya:**

- `handleRoot()` funksiyasi to'liq HTML sahifa qaytaradi
- HTML + CSS + JavaScript barchasi ESP32 ichida
- Real-time polling (har 1 soniyada `/data` endpointga so'rov)
- To'g'ridan-to'g'ri ESP32 IP manziliga kirib boshqarish mumkin

**Ikkinchi versiya:**

- HTML sahifa yo'q
- Barcha UI frontend loyihalarda (admin-panel, user-frontend)

**Foyda:** Birinchi versiyada hech qanday frontend loyiha kerak emas, to'g'ridan-to'g'ri ESP32ga kirib boshqarish mumkin.

---

### 4. **AP-ga Ulangan Mijozlar Sonini Tekshirish**

**Birinchi versiya:**

```cpp
if (WiFi.softAPgetStationNum() == 0 && motorState == "ON") {
  motorNew = false;
  motorState = "OFF";
  digitalWrite(MOTOR1_PIN, LOW);
  digitalWrite(MOTOR2_PIN, LOW);
  Serial.println("Hech kim ulanmagan: motor avtomatik o'chirildi");
}
```

**Ikkinchi versiya:**

- Bu funksiya yo'q
- Mijozlar sonini tekshirish mumkin emas

**Foyda:** Xavfsizlik - agar hech kim ESP32ga ulanmagan bo'lsa, motor avtomatik o'chiriladi.

---

### 5. **TFT Ekran Optimizatsiyasi (Tejamkor Yangilash)**

**Birinchi versiya:**

- `prevWaterDepth`, `prevHeight`, `prevTotalLitres`, `prevMotorState`, `prevTotalElectricity`, `prevTimerDisplay` o'zgaruvchilari
- Faqat o'zgargan qiymatlar yangilanadi
- `runTFTDisplay()` funksiyasi - har bir qiymatni alohida tekshiradi va faqat o'zgarganda yangilaydi
- TFT ekranda to'liq ma'lumotlar ko'rsatiladi:
  - Suv chuqurligi
  - Balandlik
  - Suv miqdori (L)
  - Elektr (kW)
  - Motor holati
  - Timer qolgan vaqt (mm:ss)

**Ikkinchi versiya:**

- TFT ekran funksiyalari **umuman yo'q**
- TFT ekran ishlatilmaydi

**Foyda:** Birinchi versiyada TFT ekranda barcha ma'lumotlar ko'rsatiladi, optimizatsiya tufayli tez ishlaydi.

---

### 6. **waterVolume O'zgaruvchisi**

**Birinchi versiya:**

```cpp
int waterVolume = 200;  // Litr
```

**Ikkinchi versiya:**

- Bu o'zgaruvchi yo'q

**Foyda:** Suv hajmini saqlash va hisoblash uchun.

---

### 7. **heightOld va motorOld Tracking**

**Birinchi versiya:**

```cpp
int heightOld = 0;
bool motorOld = false;

// runSensor() ichida:
if ((motorNew || height != heightOld) && height > waterDepth && !motorFault) {
  motorState = "ON";
}
// ...
heightOld = height;
motorOld = motorNew;
```

**Ikkinchi versiya:**

- Bu tracking yo'q
- Balandlik o'zgarishini kuzatish yo'q

**Foyda:** Balandlik o'zgarishini aniqlash va motor holatini to'g'ri boshqarish.

---

### 8. **TFT Ekranda AP IP Ko'rsatish**

**Birinchi versiya:**

```cpp
void setupAP() {
  WiFi.softAP(AP_SSID, AP_PASS);
  IPAddress IP = WiFi.softAPIP();
  tft.setCursor(0, 20);
  tft.setTextColor(ST77XX_GREEN);
  tft.print("AP IP: ");
  tft.println(IP);
}
```

**Ikkinchi versiya:**

- TFT ekran yo'q, shuning uchun IP ko'rsatish ham yo'q

**Foyda:** Foydalanuvchi ESP32 IP manzilini ko'rib, to'g'ridan-to'g'ri ulanadi.

---

### 9. **TFT Ekranda Timer Ko'rsatish (mm:ss Formatida)**

**Birinchi versiya:**

```cpp
// runTFTDisplay() ichida:
unsigned long minutes = remSec / 60;
unsigned long seconds = remSec % 60;
char buf[6];
sprintf(buf, "%02lu:%02lu", minutes, seconds);
String timerStr = String(buf);
tft.print("Timer: ");
tft.println(timerStr);
```

**Ikkinchi versiya:**

- TFT ekran yo'q, shuning uchun timer ko'rsatish ham yo'q

**Foyda:** TFT ekranda timer qolgan vaqtini ko'rish.

---

### 10. **updateTimer() Funksiyasi (Alohida)**

**Birinchi versiya:**

```cpp
void updateTimer() {
  unsigned long now = millis();
  if (timerActive) {
    if (now >= timerEndTime) {
      timerActive = false;
      motorNew = false;
      Serial.println("Timer tugadi – endi balandlikga mos ishlaydi");
    }
  }
}
```

**Ikkinchi versiya:**

- Timer tekshirish `loop()` ichida, alohida funksiya emas

**Foyda:** Kod tuzilishi yaxshiroq, alohida funksiya sifatida.

---

### 11. **runSensor() va updateMotorState() Alohida Funksiyalar**

**Birinchi versiya:**

- `runSensor()` - sensor ma'lumotlarini o'qish va motor holatini hisoblash
- `updateMotorState()` - motor holatini yangilash va tokni tekshirish
- Alohida, aniq funksiyalar

**Ikkinchi versiya:**

- `updateSensors()` - barcha narsa bir funksiyada

**Foyda:** Kod tuzilishi yaxshiroq, oson tushunish va maintain qilish.

---

### 12. **Real-time Polling (JavaScript)**

**Birinchi versiya:**

```javascript
setInterval(fetchData, 1000); // Har 1 soniyada

function fetchData() {
  fetch('/data')
    .then((res) => res.json())
    .then((obj) => {
      // Ma'lumotlarni yangilash
    });
}
```

**Ikkinchi versiya:**

- WebSocket ishlatiladi (real-time, polling emas)
- Lekin birinchi versiyada polling ham ishlaydi

**Foyda:** Oddiy va ishonchli, WebSocket bo'lmasa ham ishlaydi.

---

### 13. **TFT Ekranda "System starting..." Xabari**

**Birinchi versiya:**

```cpp
tft.println("System starting...");
```

**Ikkinchi versiya:**

- TFT ekran yo'q

**Foyda:** Tizim ishga tushayotganini ko'rsatish.

---

## ✅ Ikkinchi versiyada BOR, Birinchi versiyada YO'Q bo'lgan featurelar

### 1. **MQTT Communication**

- MQTT broker orqali aloqa
- Device-specific topics
- Global topics (backward compatibility)

### 2. **Backend Integration**

- NestJS backend
- MongoDB database
- REST API
- WebSocket (Socket.IO)

### 3. **User Management**

- Authentication (JWT)
- Role-based access (ADMIN/USER)
- User assignment to devices

### 4. **Multi-Device Support**

- Bir nechta ESP32 qurilmalarini boshqarish
- Device-specific MQTT topics

### 5. **Data Persistence**

- MongoDB database
- Historical data saqlash (hozircha placeholder)

### 6. **Admin Panel**

- React admin panel
- User management
- Device management
- Table/Grid views

### 7. **User Frontend**

- React user frontend
- Mobile app (Capacitor)
- Real-time updates (WebSocket)

### 8. **Offline Detection**

- Backend har 30 sekundda offline qurilmalarni aniqlaydi

### 9. **Timer Management (Backend)**

- Backend har sekundda timerlarni tekshiradi
- Timer tugaganda avtomatik motor o'chiriladi

### 10. **Multi-language Support**

- Uzbek, English, Russian

---

## 📊 Xulosa

### Birinchi versiya (AP + WebServer) - **Standalone Solution**

✅ **Afzalliklari:**

- Mustaqil ishlaydi (backend kerak emas)
- Internet kerak emas
- To'g'ridan-to'g'ri ESP32ga ulanib boshqarish
- TFT ekranda barcha ma'lumotlar
- Oddiy va tez setup
- Xavfsizlik (mijozlar sonini tekshirish)

❌ **Kamchiliklari:**

- Bir nechta qurilmalarni boshqarish qiyin
- Ma'lumotlar saqlanmaydi
- User management yo'q
- Real-time updates polling orqali (WebSocket emas)

---

### Ikkinchi versiya (MQTT + Backend) - **Enterprise Solution**

✅ **Afzalliklari:**

- Bir nechta qurilmalarni boshqarish
- User management va authentication
- Data persistence (MongoDB)
- Real-time updates (WebSocket)
- Admin panel va user frontend
- Multi-language support
- Offline detection
- Timer management (backend)

❌ **Kamchiliklari:**

- Backend va database kerak
- MQTT broker kerak
- WiFi router kerak
- TFT ekran ishlatilmaydi
- AP rejimi yo'q (mustaqil ishlamaydi)
- Setup murakkabroq

---

## 🔄 Qo'shish Tavsiyalari

Agar ikkinchi versiyaga birinchi versiyadagi featurelarni qo'shmoqchi bo'lsangiz:

1. **TFT Ekran Qo'shish** - `runTFTDisplay()` funksiyasini qo'shing
2. **AP Rejimi Qo'shish** - WiFi.softAP() qo'shing (optional mode)
3. **WebServer Qo'shish** - Fallback sifatida (MQTT bo'lmasa)
4. **waterVolume Tracking** - Database schema ga qo'shing
5. **heightOld Tracking** - Motor control logic yaxshilash uchun

---

**Yaratilgan:** 2024
**Versiya:** 1.0.0
