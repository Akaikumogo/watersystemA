# Water System Admin Panel

Modern admin panel for Water System Management with full CRUD operations, multi-language support, and accessibility features.

## Features

- 🔐 Authentication with JWT
- 👥 User Management (CRUD)
- 📱 Device Management (CRUD)
- 🌐 Multi-language support (Uzbek, English, Russian)
- 🎨 Beautiful UI with Framer Motion animations
- 📊 Table and Grid view modes
- ⚡ Skeleton loaders for better UX
- ♿ Full accessibility support
- 📱 Fully responsive design
- 🎯 Custom hooks and HOCs for better code organization

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- React Router
- Zustand (State Management)
- React Hook Form
- i18next (Internationalization)
- Axios

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Build

```bash
npm run build
```

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:5001/api/v1
```

## Project Structure

```
admin-panel/
├── src/
│   ├── components/     # Reusable components
│   │   ├── ui/        # UI components (Button, Input, Modal, etc.)
│   │   └── layout/    # Layout components (Sidebar, Header)
│   ├── pages/         # Page components
│   ├── hooks/         # Custom hooks
│   ├── hocs/          # Higher Order Components
│   ├── store/         # Zustand stores
│   ├── lib/           # API client and utilities
│   ├── i18n/          # Internationalization
│   ├── types/         # TypeScript types
│   └── utils/         # Utility functions
├── public/
└── package.json
```

## Features Details

### Authentication
- Login page with form validation
- JWT token management
- Protected routes with HOC

### User Management
- Create, Read, Update, Delete users
- Table and Grid view modes
- Search functionality
- Role-based access (ADMIN/USER)

### Device Management
- Create, Read, Update, Delete devices
- Table and Grid view modes
- Search functionality
- Real-time device status (ONLINE/OFFLINE)

### Internationalization
- Support for 3 languages: Uzbek, English, Russian
- Language switcher in header
- All text content is translatable

### Accessibility
- ARIA labels and roles
- Keyboard navigation support
- Focus management
- Screen reader friendly

## API Integration

The admin panel connects to the backend API at `/api/v1`. Make sure the backend is running on port 5001 (or update the proxy configuration in `vite.config.ts`).

## License

MIT

