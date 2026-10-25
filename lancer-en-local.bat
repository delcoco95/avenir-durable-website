@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Site L'Avenir Durable - en local

where php >nul 2>nul
if errorlevel 1 (
  echo.
  echo  PHP n'est pas installe sur cet ordinateur.
  echo  Installez-le une fois, dans PowerShell :   winget install PHP.PHP.8.3
  echo  puis fermez et rouvrez cette fenetre. Voir README.md.
  echo.
  pause
  exit /b 1
)
if not exist ".env" (
  echo.
  echo  Fichier .env introuvable : copiez .env.example en .env et choisissez
  echo  un identifiant et un mot de passe de depart. Voir README.md.
  echo.
  pause
  exit /b 1
)
if not exist "www\accueil-initial.html" (
  where node >nul 2>nul && node build.js
)

echo.
echo  Site       : http://localhost:8000
echo  Admin      : http://localhost:8000/admin/
echo  Pour arreter : fermez cette fenetre (ou Ctrl+C).
echo.
start "" "http://localhost:8000"
php -S localhost:8000 -t www outils/routeur-local.php
