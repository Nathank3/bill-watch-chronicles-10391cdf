@echo off
echo Starting Vite... > startup_log.txt
call npx vite --port 5173 --host >> startup_log.txt 2>&1
echo Vite exited with code %errorlevel% >> startup_log.txt
