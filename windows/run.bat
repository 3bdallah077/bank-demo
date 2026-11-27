@echo off
rem ==========================================================================
rem  bank-demo  -  Windows one-click start  (NO MySQL / Maven needed)
rem  Uses an embedded H2 database file -> .\data\bank_system.mv.db
rem  Just double-click this file.
rem ==========================================================================
setlocal
chcp 65001 >nul
cd /d "%~dp0"
set "PORT=8080"

echo ==========================================================
echo    Classroom Bank Demo
echo    Demo only. Fictional accounts, no real money.
echo ==========================================================
echo.

rem ---------- 1) Find a Java runtime (17+) ----------
set "JAVA_EXE="

if defined JAVA_HOME if exist "%JAVA_HOME%\bin\java.exe" set "JAVA_EXE=%JAVA_HOME%\bin\java.exe"
if not defined JAVA_EXE if exist "%~dp0runtime\bin\java.exe" set "JAVA_EXE=%~dp0runtime\bin\java.exe"
if not defined JAVA_EXE for /f "delims=" %%p in ('where java 2^>nul') do if not defined JAVA_EXE set "JAVA_EXE=%%p"
if not defined JAVA_EXE if exist "%ProgramFiles%\Eclipse Adoptium" for /d %%d in ("%ProgramFiles%\Eclipse Adoptium\jdk-17*") do if not defined JAVA_EXE set "JAVA_EXE=%%d\bin\java.exe"
if not defined JAVA_EXE if exist "%ProgramFiles%\Java" for /d %%d in ("%ProgramFiles%\Java\jdk-17*") do if not defined JAVA_EXE set "JAVA_EXE=%%d\bin\java.exe"

if not defined JAVA_EXE goto :nojava
echo        Using Java: %JAVA_EXE%

rem ---------- 2) Check the version ----------
rem  Java is called through a temp file: quoting an .exe path that contains
rem  spaces inside a FOR /F command is unreliable on Windows and used to make
rem  this check fail with "The filename, directory name, or volume label
rem  syntax is incorrect." and then wrongly report "Java is too old".
set "JV_TMP=%TEMP%\bankdemo_java_version.txt"
"%JAVA_EXE%" -version > "%JV_TMP%" 2>&1
set "JAVAVER="
for /f "tokens=3" %%v in ('findstr /i "version" "%JV_TMP%" 2^>nul') do if not defined JAVAVER set "JAVAVER=%%~v"
if not defined JAVAVER set "JAVAVER=0"
for /f "delims=." %%a in ("%JAVAVER%") do set "JAVAMAJOR=%%a"
if not defined JAVAMAJOR set "JAVAMAJOR=0"
if "%JAVAMAJOR%"=="" set "JAVAMAJOR=0"
del "%JV_TMP%" >nul 2>&1
if %JAVAMAJOR% LSS 17 goto :oldjava

echo [1/4] Java found: version %JAVAVER%
if not exist "bank-demo.jar" goto :nojar

rem ---------- 3) Free the port if a previous run is still alive ----------
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":%PORT% .*LISTENING"') do (
  echo        Port %PORT% is busy - stopping the old instance ^(PID %%p^)
  taskkill /f /pid %%p >nul 2>&1
)
timeout /t 1 >nul

echo [2/4] Database: embedded H2 file ^(.\data\bank_system.mv.db^)
echo [3/4] Starting the application... this takes about 10 seconds
echo.

rem ---------- 4) Start the server in its own window ----------
start "bank-demo server" /min cmd /c ""%JAVA_EXE%" -jar "bank-demo.jar" --spring.profiles.active=local --server.port=%PORT% > "%~dp0server.log" 2>&1"

rem ---------- 5) Wait until it answers ----------
set /a TRIES=0
:waitloop
set /a TRIES+=1
powershell -NoProfile -Command "try{ $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:%PORT%/' -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto :ready
if %TRIES% GEQ 60 goto :timeout
timeout /t 1 >nul
goto :waitloop

:ready
echo [4/4] Server is UP.
echo.
echo  ============================================================
echo    Open in your browser:   http://localhost:%PORT%
echo.
echo    Users (password for all of them: Demo@1234)
echo      customer1   - own accounts: deposit, withdraw, transfer
echo      teller1     - find an account, deposit/withdraw for a customer
echo      manager1    - daily report, fraud flags, all transactions, audit log
echo      admin1      - create/disable users, change roles, open accounts
echo      auditor1    - read only: audit log, transactions, fraud flags
echo.
echo    From your phone (same Wi-Fi):
echo      http://YOUR-LAPTOP-IP:%PORT%      ^(run ipconfig to find it^)
echo.
echo    The server window stays open. Close it to stop the app.
echo  ============================================================
echo.
start "" "http://localhost:%PORT%"
echo Press any key to close this launcher (the server keeps running).
pause >nul
exit /b 0

:nojava
echo [X] Java was not found on this PC.
echo.
echo     Install Java 17 (free, 2 minutes):
echo       1. Go to  https://adoptium.net/temurin/releases/?version=17
echo       2. Download the Windows .msi installer (x64)
echo       3. During setup enable "Set JAVA_HOME variable" and "Add to PATH"
echo       4. RESTART this script
echo.
echo     Or put a Java folder next to this script as:  runtime\bin\java.exe
echo.
pause
exit /b 1

:oldjava
echo [X] Java %JAVAVER% is too old. Version 17 or newer is required.
echo     Download: https://adoptium.net/temurin/releases/?version=17
echo.
pause
exit /b 1

:nojar
echo [X] bank-demo.jar is missing next to this script.
echo     Extract the whole ZIP again and keep all files together.
echo.
pause
exit /b 1

:timeout
echo [X] The server did not answer within 60 seconds.
echo     Check the file server.log in this folder for the real error.
echo.
pause
exit /b 1
