# Setup Guide for Simulateur Boursier Project

## Prerequisites
- Node.js 18+ (for frontend)
- Python 3.9+ (for backend)
- npm or yarn (for frontend package management)

## Backend Setup

### 1. Navigate to Backend Directory
```bash
cd Backend
```

### 2. Create Virtual Environment (Recommended)
```bash
# On Windows
python -m venv env

# On macOS/Linux
python3 -m venv env
```

### 3. Activate Virtual Environment
```bash
# On Windows
env\Scripts\activate

# On macOS/Linux
source env/bin/activate
```

### 4. Install Python Dependencies
```bash
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

### 5. Run Migrations
```bash
python manage.py migrate
```

### 6. Create Superuser (Optional)
```bash
python manage.py createsuperuser
```

### 7. Start Backend Development Server
```bash
python manage.py runserver
```
The backend will be available at `http://localhost:8000`

---

## Frontend Setup

### 1. Navigate to Frontend Directory
```bash
cd Frontend/frontend
```

### 2. Install Node Dependencies
```bash
npm install
# or
yarn install
```

### 3. Start Development Server
```bash
npm run dev
# or
yarn dev
```
The frontend will be available at `http://localhost:3000`

---

## Project Structure

```
PROJECT_STOCKMARKET/
├── Backend/              # Django REST API
│   ├── core/            # Main API app (models, views, serializers)
│   ├── api/             # Additional API configurations
│   ├── backend/         # Django settings and configuration
│   ├── manage.py
│   ├── requirements.txt  # Main Python dependencies
│   └── requirements-dev.txt
│
├── Frontend/frontend/    # Next.js Frontend
│   ├── app/             # Next.js app directory
│   ├── public/
│   ├── package.json
│   └── tsconfig.json
│
└── pyrightconfig.json   # Type checking configuration

```

---

## Available API Endpoints

### Portfolio Management
- `GET /api/portfolio/summary/` - Get portfolio summary
- `POST /api/trade/buy/` - Buy stocks
- `POST /api/trade/sell/` - Sell stocks

### Stock Information
- `GET /api/stocks/` - List all stocks
- `POST /api/seed/stocks/` - Initialize stock data

### Transactions
- `GET /api/transactions/` - Get transaction history

### Market
- `POST /api/market/tick/` - Simulate market tick

### Forecasts
- `POST /api/forecast/monte-carlo/` - Generate Monte Carlo forecast
- `GET /api/forecast/history/` - Get forecast history

---

## Fixed Issues

✅ TypeScript type annotations added to React components
✅ Python requirements.txt created with all dependencies
✅ Type annotations added to useState hooks
✅ All callback parameters properly typed
✅ CORS configuration for frontend-backend communication

---

## Development Tips

1. **Frontend Development**: Changes will hot-reload when you save files
2. **Backend Development**: Restart the server to see changes
3. **Database**: SQLite database is stored in db.sqlite3
4. **Admin Panel**: Access Django admin at http://localhost:8000/admin/

---

## Troubleshooting

### Frontend errors about missing 'react' module
Make sure you've run `npm install` in the Frontend/frontend directory.

### Backend migration errors
Run `python manage.py migrate` to apply all migrations.

### Port already in use
- Change frontend port: `npm run dev -- -p 3001`
- Change backend port: `python manage.py runserver 8001`

