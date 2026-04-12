Jam!



Web-based lowkey music player built with cloudflare pages. R2 integrated



\## Deployment



\### GitHub Pages (Auto-deploy)

1\. Push code to GitHub - deployment happens automatically via GitHub Actions

2\. Enable GitHub Pages in repo settings: Settings > Pages > Source: GitHub Actions



\### Manual Deploy

```powershell

\# Deploy to GitHub (triggers GitHub Pages build)

./deploy.ps1 -Target github



\# Deploy to Cloudflare Pages

./deploy.ps1 -Target cloudflare



\# Or use git directly

git add -A

git commit -m "update"

git push origin main

```



\### Setup

1\. Create GitHub repo and push this code

2\. For GitHub Pages: Enable in Settings > Pages

3\. For Cloudflare: Run `wrangler login` then `wrangler pages project create`

