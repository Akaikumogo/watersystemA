# Hisobotlar (Production talablari)

## Real-time
- Har 1 soniyada `device/{deviceName}/sensor/data` va `device/{deviceName}/status` yuboriladi.
- Ma'lumotlar: `waterDepth`, `height`, `totalLitres`, `totalElectricity`, `motorState`, `activeMotor2`, `ultrasonicMode`, `status`.
- Backend `upsertSensorSnapshot` bilan DB ga saqlaydi, WebSocket orqali frontga uzatadi.

## Kunlik/Haftalik/Oylik/Yillik
- Backend (reports servisi) DB dagi sensor snapshotlardan agregat qiladi.
- Asosiy metrikalar: suv sathi (o‘rtacha/min/max), suv hajmi (L), elektr (kWh), motor ishlash holati (% ON), status (uptime/online).
- Front grafiklarida ko‘rsatish: line chart (waterDepth), bar/area (litres, kWh), pie/stack (motor ON/ OFF vaqt ulushi).
- Eksport: CSV/Excel (agregat jadval), PDF (grafik + jadval).

## Tavsiyalar
- Snapshot interval: 1s (allaqachon qo‘yilgan) – reports uchun backendda downsample (1m/5m/1h) kerak bo‘lsa qo‘shiladi.
- Uptime hisoblash: status topic dan ONLINE/OFFLINE eventlari.

