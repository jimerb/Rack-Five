@echo off
REM Rack Five — start the local static server and open the game.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1" %*
