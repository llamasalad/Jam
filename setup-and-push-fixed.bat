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
    echo Remote added: !REPO_URL!
) else (
    for /f "tokens=*" %%a in ('git remote get-url origin') do set EXISTING=%%a
    echo Remote already set: !EXISTING!
)

echo.
echo Setting up branch as 'main'...
git branch -M main 2>nul

echo.
echo Committing files...
git add -A
git commit -m "Update: Jam music player" --allow-empty

echo.
echo ==========================================
echo Attempting to push to GitHub...
echo ==========================================
echo.

REM Try normal push first
git push -u origin main 2>&1
if %ERRORLEVEL% == 0 (
    goto SUCCESS
)

echo.
echo ==========================================
echo Push failed. Checking remote status...
echo ==========================================
echo.

REM Fetch to see what remote has
git fetch origin 2>&1

REM Check if remote has commits
for /f %%i in ('git rev-list --count origin/main 2^>nul') do set REMOTE_COMMITS=%%i
if not defined REMOTE_COMMITS set REMOTE_COMMITS=0

echo Remote has %REMOTE_COMMITS% commits.
echo.

if %REMOTE_COMMITS% GTR 0 (
    echo The remote repository already has content.
    echo This usually happens when you created the repo with a README.
    echo.
    choice /C YN /M "Force push and overwrite remote content"
    if errorlevel 2 (
        echo.
        echo Cancelled. To merge instead, run these manually:
        echo   git pull origin main --allow-unrelated-histories
        echo   git push -u origin main
        pause
        exit /b 1
    )
    echo.
    echo Force pushing... This will overwrite remote content.
    git push -u origin main --force
    if %ERRORLEVEL% == 0 (
        goto SUCCESS
    ) else (
        goto FAIL
    )
) else (
    echo Remote appears empty but push failed.
    echo This might be an authentication issue.
    goto FAIL
)

:SUCCESS
echo.
echo ==========================================
echo SUCCESS! Deployed to GitHub
echo ==========================================
echo.
for /f "tokens=*" %%a in ('git remote get-url origin') do (
    set URL=%%a
    set URL=!URL:git@github.com:=https://github.com/!
    set URL=!URL:.git=/!
    echo Repository: !URL!
    echo Pages URL:  !URL!github.io/  ^(after enabling in settings^)
)
echo.
pause
exit /b 0

:FAIL
echo.
echo ==========================================
echo PUSH FAILED
echo ==========================================
echo.
echo Common fixes:
echo 1. Make sure you're logged into GitHub in your browser
echo 2. Try: git credential-manager reject https://github.com
echo    Then run this script again to re-authenticate
echo 3. Check your internet connection
echo.
echo For Windows credential issues, try:
echo   git config --global credential.helper cache
pause
exit /b 1
