@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title bank-demo
cd /d "%~dp0"

set DB_NAME=bank_system
set DB_USER=root
set PORT=8080

echo ============================================
echo   bank-demo  -  تشغيل بأمر واحد
echo ============================================
echo.

REM ---------- 1) فحص المتطلبات ----------
where java >nul 2>&1 || (echo [x] Java مش متسطّبة. نزّل JDK 11+ من adoptium.net & pause & exit /b 1)
where mvn  >nul 2>&1 || (echo [x] Maven مش متسطّب. نزّل Maven من maven.apache.org وضيف bin للـ PATH & pause & exit /b 1)

set MYSQL_BIN=
for %%c in (mysql.exe mariadb.exe) do if exist "%%~$PATH:c" set MYSQL_BIN=%%c
if "%MYSQL_BIN%"=="" (
  if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" set "MYSQL_BIN=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
)
if "%MYSQL_BIN%"=="" (echo [x] مش لاقي mysql.exe. سطّب MySQL Server أو ضيف مساره للـ PATH & pause & exit /b 1)

REM ---------- 2) الباسورد ----------
if "%DB_PASSWORD%"=="" (
  set /p DB_PASSWORD=باسورد MySQL للمستخدم root (Enter لو مفيش باسورد):
)

REM ---------- 3) اختبار الاتصال ----------
if "%DB_PASSWORD%"=="" (
  "%MYSQL_BIN%" -h 127.0.0.1 -u %DB_USER% -e "SELECT 1" >nul 2>&1
) else (
  "%MYSQL_BIN%" -h 127.0.0.1 -u %DB_USER% -p%DB_PASSWORD% -e "SELECT 1" >nul 2>&1
)
if errorlevel 1 (
  echo [x] مش قادر أدخل على MySQL. اتأكد إن الخدمة شغالة ^(Services ^> MySQL80^) والباسورد صح.
  pause & exit /b 1
)
echo [ok] الاتصال بـ MySQL تمام

REM ---------- 4) هل القاعدة موجودة؟ ----------
if "%DB_PASSWORD%"=="" (
  for /f %%n in ('""%MYSQL_BIN%" -h 127.0.0.1 -u %DB_USER% -N -B -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='%DB_NAME%' AND table_name='users';""') do set HAS_DB=%%n
) else (
  for /f %%n in ('""%MYSQL_BIN%" -h 127.0.0.1 -u %DB_USER% -p%DB_PASSWORD% -N -B -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='%DB_NAME%' AND table_name='users';""') do set HAS_DB=%%n
)

if "%HAS_DB%"=="0" (
  echo ==^> استيراد السكيما والبيانات ^(أول مرة فقط^)
  call :import db\bank_system_sample.sql || (echo [x] فشل استيراد السكيما & pause & exit /b 1)
  call :import db\demo-passwords.sql     || (echo [x] فشل استيراد الباسوردات & pause & exit /b 1)
  echo [ok] البيانات جاهزة - الباسورد للجميع: Demo@1234
) else (
  echo [ok] قاعدة %DB_NAME% موجودة بالفعل - مش هلمس بياناتك
)

REM ---------- 5) تشغيل التطبيق ----------
set DB_URL=jdbc:mysql://127.0.0.1:3306/%DB_NAME%?useSSL=false^&allowPublicKeyRetrieval=true^&serverTimezone=UTC
set DB_USERNAME=%DB_USER%
echo.
echo ==^> التطبيق شغال على http://localhost:%PORT%   ^(Ctrl+C للإيقاف^)
echo     customer1 / teller1 / manager1 / admin1 / auditor1  -  الباسورد Demo@1234
echo.
call mvn -q spring-boot:run
pause
exit /b 0

:import
if "%DB_PASSWORD%"=="" (
  "%MYSQL_BIN%" -h 127.0.0.1 -u %DB_USER% < "%~1"
) else (
  "%MYSQL_BIN%" -h 127.0.0.1 -u %DB_USER% -p%DB_PASSWORD% < "%~1"
)
exit /b %errorlevel%
