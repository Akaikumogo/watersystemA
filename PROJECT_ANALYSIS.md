# Smart Water System - Chuqur Tahlil Hujjati

## 📋 Loyiha Umumiy Ko'rinishi

Bu loyiha **Smart Water & Energy Monitoring System** - suv tizimini monitoring qilish va boshqarish uchun to'liq stack yechim. Loyiha 4 ta asosiy qismdan iborat:

1. **Backend (NestJS)** - REST API va WebSocket server
2. **Admin Panel (React + TypeScript)** - Adminlar uchun boshqaruv paneli
3. **User Frontend (React + TypeScript + Capacitor)** - Foydalanuvchilar uchun mobil/web ilova
4. **Hardware (ESP32 + Arduino)** - IoT qurilma kodi

---

## 🏗️ Arxitektura

### 1. Backend (smart_water_backend)

**Texnologiyalar:**
- NestJS (Node.js framework)
- MongoDB (Mongoose ODM)
- MQTT (IoT qurilmalar bilan aloqa)
- Socket.IO (Real-time WebSocket)
- JWT Authentication
- Swagger API Documentation

**Modullar:**

#### Auth Module
- JWT-based authentication
- Role-based access control (ADMIN/USER)
- Password hashing (bcrypt)
- Endpoints:
  - `POST /api/v1/auth/login` - Login
  - `POST /api/v1/auth/register` - Admin tomonidan user yaratish
  - `POST /api/v1/auth/register-client` - Client o'zi ro'yxatdan o'tish
  - `GET /api/v1/auth/me` - Joriy user ma'lumotlari

#### Devices Module
- Device CRUD operations
- Real-time device status monitoring
- Device command system (motor, timer, height)
- User assignment to devices
- Automatic offline detection (30 sekund interval)
- Timer management (har sekund tekshiriladi)

**Device Schema:**
```typescript
{
  name: string
  location: string
  status: 'ONLINE' | 'OFFLINE'
  waterDepth: number
  height: number
  totalLitres: number
  totalElectricity: number
  motorState: 'ON' | 'OFF'
  timerActive: boolean
  timerDuration: number (seconds)
  timerEndTime: Date
  activeMotor2: boolean
  motorFault: boolean
  userIds: string[]
  lastUpdated: Date
}
```

**Device Commands:**
- Motor ON/OFF
- Height setting (auto motor control)
- Timer (motorni ma'lum vaqtga yoqish)
- Motor switching (motor1/motor2)

#### MQTT Module
- MQTT broker bilan aloqa
- Device-specific topics: `device/{deviceName}/sensor/data`
- Global topics (backward compatibility): `sensor/data`
- Command publishing:
  - `device/{deviceName}/motor/command` - Motor control
  - `device/{deviceName}/timer/command` - Timer control
  - `device/{deviceName}/height/command` - Height setting
  - `device/{deviceName}/motor/switch` - Motor switching

#### WebSocket Gateway
- Namespace: `/devices`
- JWT authentication required
- Events:
  - `device:update` - Device ma'lumotlari yangilandi
  - `device:status` - Device status o'zgardi
  - `subscribe:device` - Ma'lum devicega subscribe qilish
  - `unsubscribe:device` - Unsubscribe

#### Reports Module
- Daily reports (placeholder)
- Monthly reports (placeholder)

#### Users Module
- User CRUD operations
- User devices list
- User assignment management

**Cron Jobs:**
1. Device status check - har 30 sekund (offline qurilmalarni aniqlash)
2. Timer check - har sekund (timer tugagan qurilmalarni o'chirish)

---

### 2. Admin Panel (admin-panel)

**Texnologiyalar:**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS
- Framer Motion (animatsiyalar)
- Zustand (state management)
- React Router
- React Hook Form
- i18next (3 til: Uzbek, English, Russian)
- Axios (API client)

**Struktura:**
```
src/
├── components/
│   ├── ui/          # Reusable UI components
│   └── layout/      # Layout components (Sidebar, Header)
├── pages/           # Page components
├── hooks/           # Custom hooks
├── hocs/            # Higher Order Components
├── store/           # Zustand stores
├── lib/             # API client
├── i18n/            # Internationalization
├── types/           # TypeScript types
└── utils/           # Utility functions
```

**Features:**
- ✅ Authentication (JWT)
- ✅ User Management (CRUD)
- ✅ Device Management (CRUD)
- ✅ Table/Grid view modes
- ✅ Search functionality
- ✅ Multi-language support
- ✅ Real-time updates (WebSocket)
- ✅ Protected routes (HOC)
- ✅ Page transitions (animations)
- ✅ Skeleton loaders

**Pages:**
- `/login` - Login page
- `/dashboard` - Dashboard
- `/dashboard/users` - Users list
- `/dashboard/users/:id` - User detail
- `/dashboard/devices` - Devices list
- `/dashboard/devices/:id` - Device detail

---

### 3. User Frontend (user-frontend)

**Texnologiyalar:**
- React 18 + TypeScript
- Vite
- Capacitor JS (mobile app support)
- HeroUI components
- Socket.IO Client
- React Hook Form + Zod (validation)
- Zustand
- i18next (3 til)
- Capacitor Preferences (storage)

**Features:**
- ✅ Mobile-first design
- ✅ Authentication (Login/Register)
- ✅ Real-time device updates (WebSocket)
- ✅ Device monitoring
- ✅ Device control (motor, timer, height)
- ✅ Capacitor storage (secure token storage)
- ✅ Full form validation
- ✅ Multi-language support

**Pages:**
- `/login` - Login
- `/register` - Registration
- `/dashboard` - User's devices list
- `/device/:id` - Device detail with controls

**Device Control:**
- Motor ON/OFF button
- Height setting (auto motor control)
- Timer setting (motorni vaqtga yoqish)
- Motor switching (motor1/motor2)
- Real-time metrics display

---

### 4. Hardware (ESP32)

**Komponentlar:**
- ESP32 microcontroller
- PZEM004Tv30 (power monitoring)
- Ultrasonic sensor (water depth)
- Flow sensor (water flow)
- 2x Motors (motor1, motor2)
- TFT display (ST7735)

**Funksiyalar:**
- WiFi connection
- MQTT client
- Sensor data collection:
  - Water depth (ultrasonic)
  - Water flow (flow sensor)
  - Power usage (PZEM004T)
  - Current monitoring
- Motor control:
  - Manual ON/OFF
  - Auto control (height-based)
  - Timer-based control
  - Motor switching (fault detection)
  - Current monitoring (fault detection)
- MQTT Topics:
  - Publish: `device/{deviceName}/sensor/data`
  - Subscribe: `device/{deviceName}/motor/command`
  - Subscribe: `device/{deviceName}/timer/command`
  - Subscribe: `device/{deviceName}/height/command`
  - Subscribe: `device/{deviceName}/motor/switch`

**Motor Control Logic:**
1. Manual command (MQTT) - `motor/command` = "ON"/"OFF"
2. Height-based auto - agar `height > waterDepth` bo'lsa, motor yoqiladi
3. Timer-based - ma'lum vaqtga motor yoqiladi
4. Fault detection - current monitoring orqali motor xatoliklarini aniqlash
5. Motor switching - motor1 xatolik bo'lsa, motor2 ga o'tadi

---

## 🔄 Data Flow

### 1. Device Data Flow (ESP32 → Backend → Frontend)

```
ESP32 → MQTT → Backend (MQTT Service) → MongoDB → WebSocket → Frontend
```

1. ESP32 sensor ma'lumotlarini to'playdi
2. MQTT orqali `device/{deviceName}/sensor/data` topicga publish qiladi
3. Backend MQTT Service bu ma'lumotlarni qabul qiladi
4. DevicesService `upsertSensorSnapshot()` orqali MongoDBga saqlaydi
5. DevicesGateway WebSocket orqali barcha connected clientlarga `device:update` event yuboradi
6. Frontend WebSocket listener orqali real-time yangilanishlarni oladi

### 2. Command Flow (Frontend → Backend → ESP32)

```
Frontend → REST API → Backend (DevicesService) → MQTT → ESP32
```

1. Frontend user command yuboradi (motor ON, timer, height)
2. REST API `/devices/:id/command` endpointga so'rov yuboradi
3. DevicesService commandni qayta ishlaydi va MongoDBni yangilaydi
4. MQTT Service commandni ESP32ga yuboradi (`device/{deviceName}/motor/command`)
5. ESP32 MQTT callback orqali commandni qabul qiladi va bajaradi
6. DevicesGateway WebSocket orqali frontendga yangilanish yuboradi

### 3. Authentication Flow

```
User → Login → Backend (AuthService) → JWT Token → Frontend (Storage)
```

1. User login credentials yuboradi
2. AuthService username/password tekshiradi
3. JWT token yaratiladi va qaytariladi
4. Frontend tokenni storagega saqlaydi
5. Keyingi so'rovlarda token `Authorization: Bearer {token}` headerida yuboriladi
6. WebSocket connection ham token bilan authenticate qilinadi

---

## 🔐 Security

1. **JWT Authentication** - Barcha API endpoints va WebSocket
2. **Password Hashing** - bcrypt (10 rounds)
3. **Role-Based Access Control** - ADMIN/USER rollari
4. **Protected Routes** - Frontend HOC orqali
5. **Token Storage** - Admin panel (localStorage), User frontend (Capacitor Preferences)

---

## 📊 Database Schema

### User Collection
```typescript
{
  _id: ObjectId
  username: string (unique)
  password: string (hashed)
  role: 'ADMIN' | 'USER'
  createdAt: Date
  updatedAt: Date
}
```

### Device Collection
```typescript
{
  _id: ObjectId
  name: string
  location: string
  status: 'ONLINE' | 'OFFLINE'
  waterDepth: number
  height: number
  totalLitres: number
  totalElectricity: number
  powerUsage: number
  motorState: 'ON' | 'OFF'
  timerActive: boolean
  timerDuration: number
  timerEndTime: Date
  activeMotor2: boolean
  motorFault: boolean
  userIds: string[] (references to User._id)
  lastUpdated: Date
  createdAt: Date
  updatedAt: Date
}
```

---

## 🌐 API Endpoints

### Auth
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/register` - Admin tomonidan user yaratish
- `POST /api/v1/auth/register-client` - Client registration
- `GET /api/v1/auth/me` - Current user

### Users
- `GET /api/v1/users` - All users (ADMIN only)
- `GET /api/v1/users/:id` - User detail
- `PATCH /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user
- `GET /api/v1/users/:id/devices` - User's devices

### Devices
- `GET /api/v1/devices` - All devices
- `GET /api/v1/devices/:id` - Device detail
- `POST /api/v1/devices` - Create device
- `PATCH /api/v1/devices/:id` - Update device
- `DELETE /api/v1/devices/:id` - Delete device
- `POST /api/v1/devices/:id/command` - Send command
- `POST /api/v1/devices/:id/assign-users` - Assign users
- `POST /api/v1/devices/:id/unassign-users` - Unassign users
- `GET /api/v1/devices/user/:userId` - User's devices

### Reports
- `GET /api/v1/reports/daily` - Daily reports
- `GET /api/v1/reports/monthly` - Monthly reports

### MQTT (Admin only)
- `POST /api/v1/mqtt/motor` - Direct motor command
- `POST /api/v1/mqtt/timer` - Direct timer command
- `POST /api/v1/mqtt/height` - Direct height command

---

## 🔌 WebSocket Events

**Namespace:** `/devices`

**Client → Server:**
- `subscribe:device` - Subscribe to device updates
- `unsubscribe:device` - Unsubscribe from device

**Server → Client:**
- `connected` - Connection confirmed
- `device:update` - Device data updated
- `device:status` - Device status changed

**Connection:**
```javascript
const socket = io('http://localhost:5001/devices', {
  auth: { token: 'JWT_TOKEN' }
})
```

---

## 📱 Mobile App (Capacitor)

User frontend Capacitor JS orqali mobile appga aylantiriladi:

**Platforms:**
- iOS
- Android

**Capacitor Plugins:**
- `@capacitor/preferences` - Secure storage
- `@capacitor/app` - App lifecycle
- `@capacitor/status-bar` - Status bar control
- `@capacitor/splash-screen` - Splash screen

**Build Commands:**
```bash
npm run cap:sync    # Sync Capacitor
npm run cap:ios     # Open iOS project
npm run cap:android # Open Android project
```

---

## 🌍 Internationalization

**Supported Languages:**
- Uzbek (uz)
- English (en)
- Russian (ru)

**Implementation:**
- i18next library
- Language files: `locales/{lang}.json`
- Language switcher in header
- Persistent language selection

---

## 🚀 Development Setup

### Backend
```bash
cd smart_water_backend
npm install
# Create .env file with:
# MONGODB_URI=mongodb://localhost:27017/watersystem
# JWT_SECRET=your-secret-key
# MQTT_BROKER_URL=mqtt://localhost:1883
# MQTT_USERNAME=optional
# MQTT_PASSWORD=optional
# PORT=5001
npm run start:dev
```

### Admin Panel
```bash
cd admin-panel
npm install
# Create .env file with:
# VITE_API_URL=http://localhost:5001/api/v1
npm run dev
# Runs on http://localhost:3000
```

### User Frontend
```bash
cd user-frontend
npm install
# Create .env file with:
# VITE_API_URL=http://localhost:5001/api/v1
# VITE_SOCKET_URL=http://localhost:5001
npm run dev
# Runs on http://localhost:3001
```

### Hardware
1. Arduino IDE yuklab oling
2. ESP32 board support qo'shing
3. Kerakli librarylar:
   - WiFi
   - PubSubClient (MQTT)
   - Adafruit_GFX
   - Adafruit_ST7735
   - PZEM004Tv30
   - NewPing
4. `monitoring_controller.ino` faylini oching
5. WiFi va MQTT sozlamalarini yangilang
6. Upload qiling

---

## 📈 Key Features

### Real-Time Monitoring
- WebSocket orqali real-time device updates
- Automatic reconnection
- Status monitoring (ONLINE/OFFLINE)

### Device Control
- Motor control (ON/OFF)
- Height-based auto control
- Timer-based control
- Motor switching (fault tolerance)

### User Management
- Role-based access (ADMIN/USER)
- User assignment to devices
- User registration (admin va client)

### Data Collection
- Water depth monitoring
- Water flow measurement
- Power usage tracking
- Electricity consumption

### Fault Detection
- Motor current monitoring
- Automatic motor switching
- Offline device detection

---

## 🔧 Configuration

### Environment Variables

**Backend (.env):**
```env
MONGODB_URI=mongodb://localhost:27017/watersystem
JWT_SECRET=your-secret-key-here
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=optional
MQTT_PASSWORD=optional
PORT=5001
```

**Admin Panel (.env):**
```env
VITE_API_URL=http://localhost:5001/api/v1
```

**User Frontend (.env):**
```env
VITE_API_URL=http://localhost:5001/api/v1
VITE_SOCKET_URL=http://localhost:5001
```

**ESP32 (Arduino code):**
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASS";
const char* mqttServer = "BROKER_IP";
const int mqttPort = 1883;
const char* deviceName = "ESP32Controller";
```

---

## 📝 Notes

1. **Device Naming:** ESP32 kodida `deviceName` backenddagi device `name` bilan mos kelishi kerak
2. **MQTT Topics:** Device-specific topics ishlatiladi, lekin global topics ham qo'llab-quvvatlanadi (backward compatibility)
3. **Timer Management:** Backend har sekund timerlarni tekshiradi va tugagan timerlarni o'chiradi
4. **Offline Detection:** Device 1 minutdan ko'p yangilanmasa, OFFLINE deb belgilanadi
5. **Motor Fault:** Current monitoring orqali motor xatoliklarini aniqlash va avtomatik motor switching
6. **WebSocket Auth:** Barcha WebSocket connectionlar JWT token bilan authenticate qilinadi

---

## 🎯 Future Improvements

1. **Reports Module** - To'liq implementatsiya (hozir placeholder)
2. **Time-series Data** - Historical data storage (InfluxDB yoki MongoDB time-series)
3. **Notifications** - Push notifications (mobile)
4. **Analytics** - Data analytics va visualization
5. **Multi-device Support** - Bir nechta ESP32 qurilmalarini qo'llab-quvvatlash
6. **Dashboard Charts** - Real-time charts va graphs
7. **Export Data** - CSV/Excel export
8. **Alerts** - Threshold-based alerts

---

## 📚 Tech Stack Summary

**Backend:**
- NestJS, MongoDB, MQTT, Socket.IO, JWT, Swagger

**Admin Panel:**
- React, TypeScript, Vite, Tailwind, Framer Motion, Zustand, i18next

**User Frontend:**
- React, TypeScript, Vite, Capacitor, HeroUI, Socket.IO, Zod, Zustand, i18next

**Hardware:**
- ESP32, Arduino, MQTT Client, Sensors (PZEM, Ultrasonic, Flow)

---

## ✅ Testing Checklist

- [ ] Backend API endpoints
- [ ] WebSocket connections
- [ ] MQTT communication
- [ ] Authentication flow
- [ ] Device CRUD operations
- [ ] Device commands
- [ ] Real-time updates
- [ ] Mobile app (iOS/Android)
- [ ] Multi-language support
- [ ] Offline detection
- [ ] Timer management
- [ ] Motor fault detection

---

**Yaratilgan:** 2024
**Versiya:** 1.0.0
**Litsenziya:** MIT

