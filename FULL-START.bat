@echo off
chcp 65001 >nul
title 🎰 СЕККА - Полноценный запуск проекта

echo.
echo ╔══════════════════════════════════════════════════════════════════════════════╗
echo ║                   🎰 СЕККА - ПОЛНОЦЕННЫЙ ЗАПУСК ПРОЕКТА                  ║
echo ╚══════════════════════════════════════════════════════════════════════════════╝
echo.

echo 🛑 Остановка всех процессов...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im python.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo ✅ Все процессы остановлены
echo.

echo 📦 Шаг 1: Проверка зависимостей сервера
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
cd /d %~dp0server

if not exist "package.json" (
    echo ❌ ОШИБКА: package.json не найден в папке server!
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo ⚠️ Устанавливаю зависимости сервера...
    call npm install
) else (
    echo ✅ Зависимости сервера установлены
)
echo.

echo 📦 Шаг 2: Проверка зависимостей клиента
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
cd /d %~dp0client

if not exist "package.json" (
    echo ❌ ОШИБКА: package.json не найден в папке client!
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo ⚠️ Устанавливаю зависимости клиента...
    call npm install
) else (
    echo ✅ Зависимости клиента установлены
)
echo.

echo 🚀 Шаг 3: Запуск сервера (порт 3006)
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
cd /d %~dp0server
start "🎮 Сервер" cmd /k "set PORT=3006 && npm start"
timeout /t 8 /nobreak >nul
echo ✅ Сервер запущен
echo.

echo 🌐 Шаг 4: Запуск клиента React (порт 3000)
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
cd /d %~dp0client
start "🌐 Клиент" cmd /k "set PORT=3000 && npm start"
timeout /t 5 /nobreak >nul
echo ✅ Клиент запущен
echo.

echo ╔══════════════════════════════════════════════════════════════════════════════╗
echo ║                       ✅ ВСЕ СЕРВИСЫ ЗАПУЩЕНЫ!                             ║
echo ╚══════════════════════════════════════════════════════════════════════════════╝
echo.

timeout /t 5 /nobreak >nul
start http://localhost:3000
echo.

echo 📋 ДОСТУПНЫЕ АДРЕСА:
echo    🎮 Сервер API: http://localhost:3006/api
echo    🌐 Клиент: http://localhost:3000
echo.
echo ⚠️ НЕ ЗАКРЫВАЙТЕ окна командной строки!
echo.

pause
