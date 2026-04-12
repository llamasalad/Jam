@echo off
echo Pushing to GitHub...

REM Check if remote exists
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo.
    echo No remote configured. Run this first:
    echo git remote add origin https://github.com/YOUR_USERNAME/jam.git
    echo.
    pause
    exit /b 1
)

git add -A
git commit -m "update: %date% %time%" --allow-empty
git push origin main 2>nul || git push origin master

if errorlevel 1 (
    echo.
    echo Push failed. Make sure you have set the remote correctly.
    pause
) else (
    echo.
    echo Done! Check your repo on GitHub.
    timeout /t 2 >nul
)
