@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Envoi du site L'Avenir Durable sur l'hebergement OVH

rem ==== Hebergement OVH (espace client > Hebergements > onglet FTP-SSH) ====
set "HOTE=A_RENSEIGNER"
set "COMPTE=A_RENSEIGNER"
set "ADRESSE=https://avenirdurable.fr"
rem ==========================================================================

echo.
echo  ==============================================================
echo   Envoi du site L'Avenir Durable (FTP chiffre)
echo  ==============================================================
echo.

if "%HOTE%"=="A_RENSEIGNER" (
  echo  Ouvrez ce fichier avec le Bloc-notes et renseignez HOTE et COMPTE
  echo  ^(serveur FTP et identifiant FTP de l'hebergement^). Voir README.md.
  echo.
  pause
  exit /b 1
)
if not exist "deploy\installation.txt" (
  echo  Dossier "deploy" introuvable : lancez ce fichier depuis le dossier du projet.
  pause
  exit /b 1
)

echo  Que voulez-vous faire ?
echo.
echo   1 - Premiere installation : tout le site + le fichier .env
echo   2 - Mise a jour du programme seulement (admin, styles, scripts, images du site)
echo       sans toucher aux textes et photos modifies depuis l'administration
echo.
set /p CHOIX="  Votre choix (1 ou 2) : "
echo.

if "%CHOIX%"=="1" (
  if not exist ".env" (
    echo  Fichier .env introuvable dans ce dossier.
    pause
    exit /b 1
  )
  set "LISTE=deploy\installation.txt"
) else if "%CHOIX%"=="2" (
  set "LISTE=deploy\mise-a-jour.txt"
) else (
  echo  Choix non reconnu.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "outils\envoyer-ftp.ps1" -Hote "%HOTE%" -Compte "%COMPTE%" -Liste "%LISTE%"
if errorlevel 1 (
  echo.
  echo  L'envoi a echoue. Verifiez le mot de passe FTP et votre connexion Internet, puis relancez.
) else (
  echo.
  echo  Envoi termine. Ouvrez %ADRESSE%/admin/
)
echo.
pause
