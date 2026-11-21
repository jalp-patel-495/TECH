@echo off
echo ===================================================
echo   Live Auction Platform - Unified Launch System
echo ===================================================

echo [1/3] Starting Local PostgreSQL on port 5433...
start "PostgreSQL Server" "C:\Program Files\PostgreSQL\18\bin\postgres.exe" -D "C:\Users\JALP PATEL\Downloads\Tech\backend\postgres_data" -p 5433

timeout /t 2 /nobreak > nul

echo [2/3] Starting Node.js + Express + Socket.IO Backend on port 5000...
start "Auction Backend API" cmd /k "cd backend && npm run dev"

timeout /t 2 /nobreak > nul

echo [3/3] Starting Vite React Frontend on port 5173...
start "Auction Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ===================================================
echo All services launched!
echo Frontend: http://localhost:5173
echo Backend API: http://localhost:5000/api
echo Health Check: http://localhost:5000/api/health
echo ===================================================
pause
