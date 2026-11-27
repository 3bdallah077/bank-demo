@echo off
rem Deletes the embedded database so the next run starts from the original sample data.
chcp 65001 >nul
cd /d "%~dp0"
echo This deletes the database file and restores the original sample data.
echo Close the "bank-demo server" window first, then press any key.
pause >nul
if exist "data" (
  rmdir /s /q "data"
  echo [ok] Database deleted. Start the app again with run.bat
) else (
  echo [i] No database found - nothing to reset.
)
echo.
pause
