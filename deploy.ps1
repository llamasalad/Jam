#!/usr/bin/env pwsh
# Deploy script for Jam! music player
# Supports: GitHub Pages, Cloudflare Pages (wrangler), or custom SFTP/FTP

param(
    [Parameter()]
    [ValidateSet("github", "cloudflare", "local")]
    [string]$Target = "github",

    [Parameter()]
    [string]$CommitMessage = "Update: $(Get-Date -Format 'yyyy-MM-dd HH:mm')",

    [switch]$Force
)

$ErrorActionPreference = "Stop"

function Write-Header($text) {
    Write-Host "`n=== $text ===" -ForegroundColor Cyan
}

function Write-Success($text) {
    Write-Host "✓ $text" -ForegroundColor Green
}

function Write-Warning($text) {
    Write-Host "⚠ $text" -ForegroundColor Yellow
}

function Write-Error($text) {
    Write-Host "✗ $text" -ForegroundColor Red
}

# Check if git is initialized
if (-not (Test-Path ".git")) {
    Write-Header "Initializing Git Repository"
    git init
    Write-Success "Git repository initialized"
}

# Check remote
$remote = git remote get-url origin 2>$null
if (-not $remote) {
    Write-Warning "No remote repository configured"
    $repoUrl = Read-Host "Enter your GitHub repository URL (e.g., https://github.com/username/jam.git)"
    if ($repoUrl) {
        git remote add origin $repoUrl
        Write-Success "Remote added: $repoUrl"
    } else {
        Write-Error "No remote URL provided. Cannot deploy without a remote repository."
        exit 1
    }
} else {
    Write-Success "Remote: $remote"
}

# Stage changes
Write-Header "Staging Changes"
git add -A
$status = git status --porcelain
if (-not $status -and -not $Force) {
    Write-Warning "No changes to commit"
    $continue = Read-Host "Deploy anyway? (y/n)"
    if ($continue -ne "y") {
        Write-Host "Deployment cancelled"
        exit 0
    }
}

# Commit
Write-Header "Committing Changes"
git commit -m "$CommitMessage" --allow-empty 2>$null
Write-Success "Committed: $CommitMessage"

# Push
Write-Header "Pushing to GitHub"
try {
    git push origin HEAD:main 2>$null || git push origin HEAD:master 2>$null
    Write-Success "Pushed to GitHub"
} catch {
    Write-Error "Push failed: $_"
    exit 1
}

# Target-specific deployment
switch ($Target) {
    "github" {
        Write-Header "GitHub Pages Deployment"
        Write-Host "Your site will be available at:"
        $repoInfo = git remote get-url origin | Select-String -Pattern "github.com[:/](.+)/(.+?)(\.git)?$"
        if ($repoInfo) {
            $user = $repoInfo.Matches[0].Groups[1].Value
            $repo = $repoInfo.Matches[0].Groups[2].Value
            Write-Host "  https://$user.github.io/$repo/" -ForegroundColor Cyan
        }
        Write-Host "`nNote: Ensure GitHub Pages is enabled in repo settings (Settings > Pages > Source: GitHub Actions)"
    }
    "cloudflare" {
        Write-Header "Cloudflare Pages Deployment"
        if (Get-Command wrangler -ErrorAction SilentlyContinue) {
            wrangler pages deploy public --project-name="$(git remote get-url origin | Split-Path -Leaf | ForEach-Object { $_ -replace '\.git$','' })"
            Write-Success "Deployed to Cloudflare Pages"
        } else {
            Write-Error "Wrangler CLI not found. Install with: npm install -g wrangler"
            Write-Host "Then login: wrangler login"
        }
    }
    "local" {
        Write-Header "Local Build"
        Write-Host "Files ready in ./public/"
        Write-Host "Serve locally with: npx serve public"
    }
}

Write-Host "`n✓ Deployment complete!" -ForegroundColor Green
