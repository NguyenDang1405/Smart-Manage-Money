@echo off
title Smart Money Manager Launcher
color 0b
echo ====================================================
echo      Smart Money Manager - Dev Auto Launcher
echo ====================================================
echo.

echo [+] Dang don dep cac tien trinh ngrok bi treo cu...
taskkill /f /im ngrok.exe >nul 2>&1

echo [+] Dang cap nhat Prisma Client (Database Client)...
cd apps\api
call npx prisma generate
cd ..\..

echo [+] Dang khoi dong Ngrok API Tunnel (Ket noi phone)...
start "Ngrok API Tunnel" cmd /k "ngrok http 4000 --config=ngrok-api.yml --domain=rabidly-premorula-odessa.ngrok-free.dev"

echo [+] Dang khoi dong Localtunnel Web (Ket noi Google Login)...
start "Localtunnel Web" cmd /k "npx localtunnel --port 8081 --subdomain nguyen1405-web"

echo [+] Dang khoi dong Backend API Server (Port 4000)...
start "Backend API Server" cmd /k "cd apps\api && pnpm dev"

echo [+] Dang khoi dong Mobile Expo Metro (Port 8081)...
start "Expo Metro Bundler" cmd /k "cd apps\mobile && npx expo start -c --tunnel"

echo.
echo ====================================================
echo  Khoi dong thanh cong! 4 cua so moi da duoc mo:
echo  1. Ngrok API Tunnel [Cong ket noi internet cho dien thoai]
echo  2. Localtunnel Web [Cong ket noi Google Login cho dien thoai]
echo  3. Backend API Server [May chu API du lieu]
echo  4. Expo Metro Bundler [Giao dien mobile app]
echo ====================================================
echo.
pause
