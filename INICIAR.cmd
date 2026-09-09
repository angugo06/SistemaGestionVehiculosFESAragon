@echo off
chcp 65001 >nul
title Aragón Movilidad
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\iniciar.ps1"
if errorlevel 1 pause
