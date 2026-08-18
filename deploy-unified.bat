@echo off
echo ====================================================
echo Starting Unified Trackora Build Process...
echo ====================================================

echo.
echo [1/2] Building Unified Web App (React/Vite)...
cd admin-dashboard
call npm install
call npm run build
cd ..

echo.
echo [2/2] Starting Unified Nginx Web Server and Backend Services...
docker-compose down
docker-compose up -d --build

echo.
echo ====================================================
echo DONE! The unified platform is now running.
echo Access the unified application at: http://localhost
echo ====================================================
pause
