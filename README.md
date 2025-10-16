# CASHPOT V7 - Gaming Management System

Un sistem complet de management pentru industria gaming, dezvoltat cu tehnologii moderne și design profesional.

## 🚀 Caracteristici Principale

- **14 Module Complete**: Management pentru toate aspectele unei operațiuni de gaming
- **Design Modern**: Interfață glassmorphism cu animații fluide
- **Autentificare Securizată**: JWT cu roluri și permisiuni
- **CRUD Complet**: Operații Create, Read, Update, Delete pentru toate entitățile
- **Export/Import**: Suport Excel și CSV
- **Upload Fișiere**: Management documente și imagini
- **Rapoarte ONJN**: Generare automată rapoarte conformitate
- **Responsive Design**: Optimizat pentru desktop și mobile

## 📋 Module Disponibile

1. **Dashboard** - Overview principal cu statistici
2. **Companii** - Management companii de gaming
3. **Locații** - Management locații de gaming
4. **Furnizori** - Management furnizori de jocuri
5. **Cabinete** - Management cabinetelelor
6. **Game Mixes** - Management mixurilor de jocuri
7. **Sloturi** - Management sloturilor de gaming
8. **Depozit** - Management inventarului
9. **Metrologie CVT** - Management dispozitive calibrare
10. **Jackpots** - Management jackpot-urilor
11. **Facturi** - Management facturilor
12. **Rapoarte ONJN** - Rapoarte conformitate
13. **Documente Legale** - Management documente
14. **Utilizatori** - Management utilizatori sistem

## 🛠 Tehnologii Utilizate

### Frontend
- **React 18** - Framework principal
- **Vite** - Build tool rapid
- **Tailwind CSS** - Styling modern
- **React Router** - Navigare
- **Context API** - State management
- **Lucide React** - Iconuri moderne
- **React Hot Toast** - Notificări

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **MongoDB** - Baza de date
- **Mongoose** - ODM pentru MongoDB
- **JWT** - Autentificare
- **Multer** - Upload fișiere
- **Bcrypt** - Hashing parole

## 🚀 Instalare și Rulare

### Prerequisites
- Node.js 18+
- MongoDB (local sau Atlas)
- Git

### 1. Clonează repository-ul
```bash
git clone https://github.com/your-username/cashpot-v7.git
cd cashpot-v7
```

### 2. Instalează dependențele Frontend
```bash
npm install
```

### 3. Instalează dependențele Backend
```bash
cd backend
npm install
```

### 4. Configurează variabilele de mediu
```bash
# Copiază fișierul de configurare
cp backend/env.example backend/.env

# Editează configurația
nano backend/.env
```

### 5. Pornește aplicația

#### Development
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
npm run dev
```

#### Production
```bash
# Build frontend
npm run build

# Pornește backend
cd backend
npm start
```

## 🔐 Autentificare

### Credențiale Demo
- **Utilizator**: admin
- **Parolă**: admin123

### Roluri Disponibile
- **Admin**: Acces complet la toate modulele
- **Manager**: Acces limitat la module specifice
- **User**: Acces doar citire

## 📊 API Endpoints

### Autentificare
- `POST /api/auth/login` - Autentificare
- `GET /api/auth/verify` - Verificare token
- `POST /api/auth/logout` - Deconectare

### Entități
- `GET /api/{entity}` - Listare entități
- `POST /api/{entity}` - Creare entitate
- `PUT /api/{entity}/:id` - Actualizare entitate
- `DELETE /api/{entity}/:id` - Ștergere entitate
- `GET /api/{entity}/export/excel` - Export Excel

### Upload
- `POST /api/upload` - Upload fișiere

## 🎨 Design System

### Culori Principale
- **Primary**: Blue (#2563eb)
- **Success**: Green (#10b981)
- **Warning**: Yellow (#f59e0b)
- **Error**: Red (#ef4444)

### Componente
- **Glassmorphism**: Efecte sticlă cu backdrop-blur
- **Gradients**: Tranziții de culori moderne
- **Shadows**: Umbre sofisticate pentru adâncime
- **Animations**: Tranziții fluide și micro-interacțiuni

## 📱 Responsive Design

- **Mobile First**: Optimizat pentru dispozitive mobile
- **Breakpoints**: sm, md, lg, xl
- **Touch Friendly**: Butoane și elemente optimizate pentru touch
- **Progressive Enhancement**: Funcționalitate îmbunătățită pe dispozitive mai mari

## 🔒 Securitate

- **JWT Authentication**: Token-uri securizate
- **Password Hashing**: Bcrypt pentru parole
- **CORS Protection**: Configurat pentru producție
- **Input Validation**: Validare pe client și server
- **Rate Limiting**: Protecție împotriva atacurilor
- **Helmet**: Headere de securitate

## 📈 Performanță

### Frontend
- **Code Splitting**: Încărcare lazy a componentelor
- **Image Optimization**: Optimizare automată imagini
- **CSS Purging**: Eliminare CSS neutilizat
- **Bundle Optimization**: Minimizare bundle-uri

### Backend
- **Database Indexing**: Indexuri optimizate
- **Query Optimization**: Interogări eficiente
- **Caching**: Cache pentru date statice
- **Compression**: Compresie gzip

## 🚀 Deployment

### Frontend (GitHub Pages)
```bash
npm run build
# Deploy la GitHub Pages
```

### Backend (Render.com)
```bash
# Conectează repository-ul la Render
# Configurează variabilele de mediu
# Deploy automat la push
```

### Database (MongoDB Atlas)
1. Creează cluster MongoDB Atlas
2. Configurează accesul
3. Actualizează MONGODB_URI în .env

## 📝 Documentație API

Documentația completă API este disponibilă la:
- **Development**: http://localhost:5000/api
- **Production**: https://cashpot-v7-backend.onrender.com/api

## 🤝 Contribuții

1. Fork repository-ul
2. Creează branch pentru feature (`git checkout -b feature/AmazingFeature`)
3. Commit modificările (`git commit -m 'Add some AmazingFeature'`)
4. Push la branch (`git push origin feature/AmazingFeature`)
5. Deschide Pull Request

## 📄 Licență

Distribuit sub licența MIT. Vezi `LICENSE` pentru mai multe informații.

## 📞 Contact

- **Email**: contact@cashpot-v7.com
- **Website**: https://jeka7ro.github.io/cashpot-v7/
- **GitHub**: https://github.com/jeka7ro/cashpot-v7

## 🙏 Mulțumiri

- React Team pentru framework-ul excelent
- Tailwind CSS pentru sistemul de design
- MongoDB pentru baza de date
- Toate bibliotecile open-source utilizate

---

**CASHPOT V7** - Sistemul complet de management pentru industria gaming! 🎰
# Force redeploy Thu Oct 16 14:35:38 EEST 2025
