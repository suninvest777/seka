@echo off
chcp 65001 >nul
title 🎰 СЕККА - Быстрый запуск

echo.
echo ╔══════════════════════════════════════════════════════════════════════════════╗
echo ║                        🎰 СЕККА - БЫСТРЫЙ ЗАПУСК                          ║
echo ╚══════════════════════════════════════════════════════════════════════════════╝
echo.

echo 🛑 Остановка старых процессов...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im python.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo ✅ Процессы остановлены
echo.

echo 🚀 Запуск сервера (порт 3006)...
cd /d %~dp0server
start "🎮 Сервер" cmd /k "set PORT=3006 && npm start"
timeout /t 8 /nobreak >nul
echo ✅ Сервер запущен
echo.

echo 🌐 Запуск клиента React (порт 3000)...
cd /d %~dp0client
start "🌐 Клиент" cmd /k "set PORT=3000 && npm start"
timeout /t 5 /nobreak >nul
echo ✅ Клиент запущен
echo.

echo ╔══════════════════════════════════════════════════════════════════════════════╗
echo ║                       ✅ ИГРА ЗАПУЩЕНА!                                   ║
echo ╚══════════════════════════════════════════════════════════════════════════════╝
echo.

timeout /t 5 /nobreak >nul
start http://localhost:3000
echo.

echo 📋 АДРЕСА:
echo    🎮 Сервер: http://localhost:3006/api
echo    🌐 Клиент: http://localhost:3000
echo    📱 С телефона: http://[ВАШ-IP]:3000
echo.
echo ⚠️ НЕ ЗАКРЫВАЙТЕ окна сервера и клиента!
echo.

pause




