
npm run d# Smart Water & Energy Monitoring System - Feature List

## 📋 Loyiha Umumiy Ko'rinishi

**Smart Water & Energy Monitoring System** - Suv va energiya tizimlarini real vaqtda monitoring qilish va boshqarish uchun to'liq stack yechim.

---

## 🏗️ Loyiha Strukturasi

Loyiha 5 ta asosiy qismdan iborat:

1. **Backend (NestJS)** - REST API va WebSocket server
2. **Admin Panel (React + TypeScript)** - Adminlar uchun boshqaruv paneli
3. **User Frontend (React + TypeScript + Capacitor)** - Foydalanuvchilar uchun mobil/web ilova
4. **Landing Page (Next.js)** - Marketing sahifasi
5. **Hardware (ESP32 + Arduino)** - IoT qurilma kodi

---

## 🔧 Backend Features (smart_water_backend)

### Authentication & Authorization

- ✅ JWT-based authentication
- ✅ Role-based access control (ADMIN/USER)
- ✅ Password hashing (bcrypt)
- ✅ Public endpoints (login, register-client, stats)
- ✅ Protected endpoints (JWT required)
- ✅ Default admin user (admin/admin123)

### Devices Management

- ✅ Device CRUD operations
- ✅ Real-time device status monitoring
- ✅ Device command system:
  - Motor ON/OFF
  - Height setting (auto motor control)
  - Timer (motorni ma'lum vaqtga yoqish)
  - Motor switching (motor1/motor2)
- ✅ User assignment to devices
- ✅ Automatic offline detection (30 sekund interval)
- ✅ Timer management (har sekund tekshiriladi)
- ✅ Motor fault detection
- ✅ Public stats endpoint (device count, online/offline)

### MQTT Integration

- ✅ MQTT broker bilan aloqa
- ✅ Device-specific topics: `device/{deviceName}/sensor/data`
- ✅ Global topics (backward compatibility): `sensor/data`
- ✅ Command publishing:
  - `device/{deviceName}/motor/command` - Motor control
  - `device/{deviceName}/timer/command` - Timer control
  - `device/{deviceName}/height/command` - Height setting
  - `device/{deviceName}/motor/switch` - Motor switching

### WebSocket Gateway

- ✅ Namespace: `/devices`
- ✅ JWT authentication required
- ✅ Real-time events:
  - `device:update` - Device ma'lumotlari yangilandi
  - `device:status` - Device status o'zgardi
  - `subscribe:device` - Ma'lum devicega subscribe qilish
  - `unsubscribe:device` - Unsubscribe

### Users Management

- ✅ User CRUD operations
- ✅ User devices list
- ✅ User assignment management
- ✅ Language preferences sync

### Contacts Module

- ✅ Contact form submissions (public)
- ✅ Contact messages CRUD (admin only)
- ✅ Read/Unread status
- ✅ Mark as read/unread
- ✅ Delete messages

### Reports Module

- ✅ Daily reports (placeholder)
- ✅ Weekly reports (placeholder)
- ✅ Monthly reports (placeholder)

### Cron Jobs

- ✅ Device status check - har 30 sekund (offline qurilmalarni aniqlash)
- ✅ Timer check - har sekund (timer tugagan qurilmalarni o'chirish)

---

## 👨‍💼 Admin Panel Features (admin-panel)

### Authentication

- ✅ Login page
- ✅ JWT token management
- ✅ Protected routes (HOC)
- ✅ Auto-redirect if authenticated

### Dashboard

- ✅ Overview statistics:
  - Total users count
  - Total devices count
  - Online devices count
  - Offline devices count
- ✅ Real-time data updates

### Users Management

- ✅ Users list (Table/Grid view)
- ✅ User detail page
- ✅ Create user (Admin only)
- ✅ Update user (Admin only)
- ✅ Delete user (Admin only)
- ✅ User devices list
- ✅ Search functionality
- ✅ View mode toggle (Table/Grid)

### Devices Management

- ✅ Devices list (Table/Grid view)
- ✅ Device detail page
- ✅ Create device
- ✅ Update device (Admin only)
- ✅ Delete device (Admin only)
- ✅ Assign users to device
- ✅ Unassign users from device
- ✅ Search functionality
- ✅ Real-time status updates (WebSocket)
- ✅ View mode toggle (Table/Grid)

### Contact Messages

- ✅ Contact messages list
- ✅ View message details
- ✅ Mark as read/unread
- ✅ Delete messages
- ✅ Unread count display
- ✅ Search functionality
- ✅ Read/Unread status indicators

### UI/UX Features

- ✅ Multi-language support (Uzbek, English, Russian)
- ✅ Language switcher
- ✅ Page transitions (animations)
- ✅ Skeleton loaders
- ✅ Responsive design
- ✅ Dark mode support (via theme)
- ✅ Landing page link

---

## 📱 User Frontend Features (user-frontend)

### Authentication

- ✅ Login page
- ✅ Registration page
- ✅ JWT token storage (Capacitor Preferences)
- ✅ Protected routes
- ✅ Auto-redirect if authenticated

### Dashboard

- ✅ User's devices list
- ✅ Device cards with status
- ✅ Online/Offline indicators
- ✅ Real-time updates (WebSocket)
- ✅ Pull to refresh

### Device Detail & Control

- ✅ Device information display:
  - Name, Location
  - Power Usage
  - Water Depth
  - Height
  - Total Litres
  - Total Electricity
  - Last Updated
- ✅ Motor Control:
  - Motor ON/OFF buttons
  - Voice control (ON/OFF)
  - Motor selection via voice (motor1/motor2)
- ✅ Height Control:
  - Set height (auto motor control)
- ✅ Timer Control:
  - Set timer (motorni vaqtga yoqish)
  - Timer remaining display
- ✅ Motor Switching:
  - Switch between motor1/motor2
- ✅ Real-time metrics display
- ✅ WebSocket real-time updates

### Voice Control

- ✅ Voice command recognition
- ✅ Motor ON/OFF via voice
- ✅ Motor selection via voice (motor1/motor2)
- ✅ Multi-language support (Uzbek, Russian, English)
- ✅ Voice instructions display
- ✅ Real-time transcript
- ✅ Error handling

### Push Notifications

- ✅ Local notifications (Capacitor)
- ✅ Web notifications (Browser API)
- ✅ Motor state change notifications
- ✅ Device status change notifications
- ✅ Permission management

### Background Monitoring

- ✅ Background device monitoring
- ✅ Timer expiration notifications
- ✅ Motor state change notifications
- ✅ Device offline notifications
- ✅ App state change detection

### Settings

- ✅ Language selection (Uzbek, English, Russian)
- ✅ Theme selection (colors)
- ✅ Language sync with backend

### Reports

- ✅ Daily reports
- ✅ Weekly reports
- ✅ Monthly reports
- ✅ Energy consumption
- ✅ Water consumption

### UI/UX Features

- ✅ Mobile-first design
- ✅ Capacitor JS integration
- ✅ HeroUI components
- ✅ Full form validation (Zod)
- ✅ Multi-language support
- ✅ Responsive design
- ✅ Accessibility support

---

## 🌐 Landing Page Features (landing-page)

### Hero Section

- ✅ Attractive hero section
- ✅ Call-to-action buttons
- ✅ Statistics display
- ✅ Animated background
- ✅ Gradient design

### Stats Section

- ✅ Real-time statistics:
  - Total devices
  - Online devices
  - Offline devices
  - Total water consumption
- ✅ Auto-refresh (5 seconds polling)
- ✅ Connection status indicator
- ✅ Animated cards

### Features Section

- ✅ 6 feature cards:
  - Real-time Monitoring
  - Device Control
  - Energy Tracking
  - Water Monitoring
  - Mobile App
  - Fault Detection
- ✅ Icons and descriptions
- ✅ Hover effects

### How It Works Section

- ✅ 3-step process:
  - Connect Device
  - Monitor
  - Control
- ✅ Step indicators
- ✅ Visual flow

### Contact Form

- ✅ Contact form (name, email, message)
- ✅ Form validation
- ✅ Success/Error messages
- ✅ Backend integration
- ✅ Multi-language support

### Footer

- ✅ Links section
- ✅ Legal links
- ✅ Copyright

### UI/UX Features

- ✅ Modern gradient design
- ✅ Smooth animations (Framer Motion)
- ✅ Responsive design
- ✅ Multi-language support (Uzbek, English, Russian)
- ✅ Smooth scrolling
- ✅ Sticky navigation

---

## 🔌 Hardware Features (ESP32)

### Sensors

- ✅ PZEM004Tv30 (power monitoring)
- ✅ Ultrasonic sensor (water depth)
- ✅ Flow sensor (water flow)
- ✅ Current monitoring

### Motor Control

- ✅ 2x Motors (motor1, motor2)
- ✅ Manual ON/OFF
- ✅ Auto control (height-based)
- ✅ Timer-based control
- ✅ Motor switching (fault detection)
- ✅ Current monitoring (fault detection)

### Communication

- ✅ WiFi connection
- ✅ MQTT client
- ✅ Device-specific topics
- ✅ Global topics (backward compatibility)

### Display

- ✅ TFT display (ST7735)
- ✅ System status display

---

## 🔄 Real-Time Features

### WebSocket Integration

- ✅ Real-time device updates
- ✅ Device status changes
- ✅ Automatic reconnection
- ✅ JWT authentication

### MQTT Integration

- ✅ Sensor data publishing
- ✅ Command receiving
- ✅ Device-specific topics
- ✅ Global topics support

### Polling (Fallback)

- ✅ Auto-refresh (10 seconds)
- ✅ Stats polling (5 seconds)
- ✅ Device data polling

---

## 🌍 Multi-Language Support

### Supported Languages

- ✅ Uzbek (uz) - Default
- ✅ English (en)
- ✅ Russian (ru)

### Implementation

- ✅ i18next library
- ✅ Language files (JSON)
- ✅ Language switcher
- ✅ Persistent language selection
- ✅ Backend language sync

---

## 🔐 Security Features

### Authentication

- ✅ JWT tokens
- ✅ Password hashing (bcrypt)
- ✅ Token storage (secure)
- ✅ Auto-logout on 401

### Authorization

- ✅ Role-based access control
- ✅ Admin/User roles
- ✅ Protected routes
- ✅ Protected API endpoints

### Data Protection

- ✅ Input validation
- ✅ SQL injection protection (MongoDB)
- ✅ XSS protection
- ✅ CORS configuration

---

## 📊 Data Management

### Database

- ✅ MongoDB database
- ✅ Mongoose ODM
- ✅ Schema validation
- ✅ Timestamps (createdAt, updatedAt)

### Data Collection

- ✅ Water depth monitoring
- ✅ Water flow measurement
- ✅ Power usage tracking
- ✅ Electricity consumption
- ✅ Device status tracking

### Data Persistence

- ✅ Device data storage
- ✅ User data storage
- ✅ Contact messages storage
- ✅ Historical data (placeholder)

---

## 📱 Mobile App Features (Capacitor)

### Platform Support

- ✅ iOS support
- ✅ Android support
- ✅ Web support

### Capacitor Plugins

- ✅ @capacitor/preferences - Secure storage
- ✅ @capacitor/app - App lifecycle
- ✅ @capacitor/status-bar - Status bar control
- ✅ @capacitor/splash-screen - Splash screen
- ✅ @capacitor/local-notifications - Local notifications
- ✅ @capacitor/push-notifications - Push notifications

### Mobile Features

- ✅ Secure token storage
- ✅ Background monitoring
- ✅ Push notifications
- ✅ App state management
- ✅ Native notifications

---

## 🎨 UI/UX Features

### Design

- ✅ Modern, clean design
- ✅ Gradient backgrounds
- ✅ Smooth animations
- ✅ Responsive layout
- ✅ Dark mode support (user-frontend)

### Components

- ✅ Reusable UI components
- ✅ Loading states
- ✅ Error states
- ✅ Empty states
- ✅ Skeleton loaders

### Accessibility

- ✅ ARIA labels
- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ Focus management

---

## 🚀 Performance Features

### Optimization

- ✅ Code splitting
- ✅ Lazy loading
- ✅ Image optimization
- ✅ Bundle optimization

### Caching

- ✅ State management (Zustand)
- ✅ Local storage
- ✅ Capacitor preferences

### Real-Time

- ✅ WebSocket (primary)
- ✅ Polling (fallback)
- ✅ Auto-reconnection

---

## 📈 Monitoring & Analytics

### Device Monitoring

- ✅ Real-time status
- ✅ Online/Offline detection
- ✅ Power usage tracking
- ✅ Water consumption tracking
- ✅ Energy consumption tracking

### System Monitoring

- ✅ Device count
- ✅ Online/Offline count
- ✅ Total consumption
- ✅ Statistics dashboard

---

## 🔔 Notification Features

### Push Notifications

- ✅ Local notifications
- ✅ Web notifications
- ✅ Motor state changes
- ✅ Device status changes
- ✅ Timer expiration

### Background Notifications

- ✅ Background monitoring
- ✅ Timer alerts
- ✅ Offline alerts
- ✅ Motor state alerts

---

## 🛠️ Development Features

### Code Quality

- ✅ TypeScript
- ✅ ESLint
- ✅ Type safety
- ✅ Code formatting

### Documentation

- ✅ Swagger API docs
- ✅ Code comments
- ✅ README files
- ✅ Project analysis docs

### Testing

- ✅ Type checking
- ✅ Linting
- ✅ Build verification

---

## 📋 API Endpoints Summary

### Auth

- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/register` - Admin tomonidan user yaratish
- `POST /api/v1/auth/register-client` - Client registration
- `GET /api/v1/auth/me` - Current user
- `PATCH /api/v1/auth/preferences` - Update preferences

### Users

- `GET /api/v1/users` - All users (ADMIN only)
- `GET /api/v1/users/:id` - User detail
- `PATCH /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user
- `GET /api/v1/users/:id/devices` - User's devices

### Devices

- `GET /api/v1/devices/stats` - Public stats
- `GET /api/v1/devices` - All devices
- `GET /api/v1/devices/:id` - Device detail
- `POST /api/v1/devices` - Create device
- `PATCH /api/v1/devices/:id` - Update device
- `DELETE /api/v1/devices/:id` - Delete device
- `POST /api/v1/devices/:id/command` - Send command
- `POST /api/v1/devices/:id/assign-users` - Assign users
- `POST /api/v1/devices/:id/unassign-users` - Unassign users
- `GET /api/v1/devices/user/:userId` - User's devices

### Contacts

- `POST /api/v1/contacts` - Create contact (public)
- `GET /api/v1/contacts` - All contacts (ADMIN only)
- `GET /api/v1/contacts/:id` - Contact detail
- `PATCH /api/v1/contacts/:id` - Update contact
- `PATCH /api/v1/contacts/:id/read` - Mark as read
- `PATCH /api/v1/contacts/:id/unread` - Mark as unread
- `DELETE /api/v1/contacts/:id` - Delete contact

### Reports

- `GET /api/v1/reports/daily` - Daily reports
- `GET /api/v1/reports/weekly` - Weekly reports
- `GET /api/v1/reports/monthly` - Monthly reports

---

## 🎯 Key Features Summary

### ✅ Real-Time Monitoring

- WebSocket orqali real-time device updates
- Automatic reconnection
- Status monitoring (ONLINE/OFFLINE)
- Real-time statistics

### ✅ Device Control

- Motor control (ON/OFF)
- Height-based auto control
- Timer-based control
- Motor switching (fault tolerance)
- Voice control

### ✅ User Management

- Role-based access (ADMIN/USER)
- User assignment to devices
- User registration (admin va client)
- Language preferences

### ✅ Data Collection

- Water depth monitoring
- Water flow measurement
- Power usage tracking
- Electricity consumption

### ✅ Fault Detection

- Motor current monitoring
- Automatic motor switching
- Offline device detection
- Motor fault detection

### ✅ Notifications

- Push notifications
- Local notifications
- Background monitoring
- Real-time alerts

### ✅ Multi-Platform

- Web applications
- Mobile apps (iOS/Android)
- Responsive design
- Cross-platform support

### ✅ Multi-Language

- Uzbek (default)
- English
- Russian
- Language persistence

---

## 🔮 Future Improvements

- [ ] Time-series data storage (InfluxDB yoki MongoDB time-series)
- [ ] Advanced analytics dashboard
- [ ] Export data (CSV/Excel)
- [ ] Threshold-based alerts
- [ ] Email notifications
- [ ] SMS notifications
- [ ] Advanced reports with charts
- [ ] Device grouping
- [ ] Scheduled commands
- [ ] Device templates
- [ ] API rate limiting
- [ ] Request logging
- [ ] Audit trail

---

**Yaratilgan:** 2024  
**Versiya:** 2.0.0  
**Litsenziya:** MIT
