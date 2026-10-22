@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Instala Node.js LTS desde https://nodejs.org y vuelve a abrir este archivo. & pause & exit /b 1)
if not exist node_modules (echo Instalando dependencias, solo la primera vez... & call npm install)
echo Abriendo la app en http://localhost:5173
start "" http://localhost:5173
call npm run dev
pause
