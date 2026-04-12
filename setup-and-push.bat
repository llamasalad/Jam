@echo off
setlocal EnableDelayedExpansion

echo ==========================================
echo    Jam! GitHub Deployment Setup
echo ==========================================
echo.

REM Check if git is initialized
if not exist ".git" (
    echo Initializing git repository...
    git init
    echo.
)

REM Check current remote
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo No remote repository configured.
    echo.
    echo Enter your GitHub repo URL:
    echo Example: https://github.com/username/jam.git
    set /p REPO_URL="URL: "
    
    if "!REPO_URL!"=="" (
        echo No URL provided. Exiting.
        pause
        exit /b 1
    )
    
    git remote add origin !REPO_URL!
    echo Remote added.
) else (
    for /f "tokens=*" %%a in ('git remote get-url origin') do set EXISTING=%%a
    echo Remote already set: !EXISTING!
    echo.
    choice /C YN /M "Use this remote"
    if errorlevel 2 (
        echo Enter new URL:
        set /p REPO_URL="URL: "
        git remote remove origin
        git remote add origin !REPO_URL!
    )
)

echo.
echo Setting up main branch...
git branch -M main 2>nul || git branch -M main

echo.
echo Committing files...
git add -A
git commit -m "Initial commit: Jam music player" --allow-empty

echo.
echo Pushing to GitHub...
git push -u origin main 2>nul || git push -u origin master

if errorlevel 1 (
    echo.
    echo ==========================================
    echo PUSH FAILED - Common fixes:
    echo ==========================================
    echo 1. Check your repo URL is correct
    echo 2. Make sure you're logged into GitHub in your browser
    echo 3. Try: git push origin main --force  (if repo is empty)
    echo.
    pause
) else (
    echo.
    echo ==========================================
    echo SUCCESS! Deployed to GitHub
    echo ==========================================
    echo.
    echo To push future updates, just run:
    echo   push-to-github.bat
    echo.
    echo Your site will be at:
    for /f "tokens=*" %%a in ('git remote get-url origin') do (
        set URL=%%a
        set URL=!URL:git@github.com:=https://github.com/!
        set URL=!URL:.git=/!
        echo   !URL!
    )
    echo.
    pause
)
