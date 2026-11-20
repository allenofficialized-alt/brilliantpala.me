# Brilliantine — Cloudflare Pages + D1

A public, login-free web launcher inspired by the reference's app launcher layout. OTT is intentionally excluded.

## Included modules

- Overview / launcher
- Instagram public post and reel embed helper (subject to Instagram embed availability)
- Music search via Apple's iTunes Search API; playback is limited to available 30-second previews
- Hacker News top-story feed and Reddit r/technology hot feed
- Offline 2048 and Snake games
- Browser shortcut that opens a URL in a new tab (not a proxy)
- Saved bookmarks and recent activity stored in Cloudflare D1

## Important limits

- Instagram private posts, login bypasses, and scraping are not supported.
- Music results are catalogue metadata and short previews supplied by Apple; this is not a full streaming service.
- The browser module opens websites in new tabs. It deliberately does not proxy arbitrary sites, bypass CORS, or evade website security.
- This is a public app. Anyone can use the shared bookmarks and activity database. Do not store private or sensitive information. Add rate limiting / abuse controls before high-traffic public use.
- Feed is sourced from the public Hacker News Firebase API. Reddit's public JSON endpoint may rate-limit or block some requests; the interface shows a clear error when Reddit is unavailable.

## Deploy from Windows 11

### 1. Download and extract
Extract `brilliantine-cloudflare.zip` to a folder such as `C:\Users\YourName\Desktop\brilliantine`.

### 2. Create the D1 database
1. Sign in at https://dash.cloudflare.com/
2. Open **Workers & Pages** → **D1 SQL Database** (or **Storage & databases** → **D1**).
3. Select **Create database**.
4. Name it `brilliantine-db`.
5. Open the new database and copy its **Database ID**.

### 3. Connect the D1 database to this project
1. Open `wrangler.toml` in Notepad.
2. Replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` with the Database ID you copied.
3. Save the file.

### 4. Create the tables
In the Cloudflare D1 database, open **Console**.
Open the local `schema.sql` file in Notepad, copy all its SQL, paste it into the D1 Console, and click **Execute**.

### 5. Deploy the complete Pages project (recommended: Git)

Cloudflare's dashboard Direct Upload is for static assets and does not deploy the `functions/` backend folder. Use Git integration for the complete website + API:

1. Create a GitHub repository and upload the entire extracted project (keep `functions/`, `public/`, `schema.sql`, and `wrangler.toml`).
2. Cloudflare → Workers & Pages → Create application → Pages → Connect to Git.
3. Select the repository.
4. Framework preset: **None**.
5. Build command: leave blank.
6. Build output directory: `public`.
7. Save and deploy.

You can also deploy with Wrangler from PowerShell after installing Node.js LTS and logging in:
```powershell
npm install -g wrangler
npx wrangler login
npx wrangler pages project create brilliantine
npx wrangler pages deploy public --project-name brilliantine --functions functions
```
If your installed Wrangler version does not accept `--functions`, use the Git integration steps above.

### 7. Bind D1 to the Pages project
1. Cloudflare → Workers & Pages → open your `brilliantine` Pages project.
2. Settings → Functions → D1 database bindings → Add binding.
3. Variable name: `DB`.
4. Select database: `brilliantine-db`.
5. Save, then trigger a new deployment.

### 8. Verify
Open `https://brilliantine.pages.dev/api/health`. It should show:
```json
{"ok":true,"service":"brilliantine-api"}
```
Then open the website and test Feed, Music, Saved, and Arcade.

## Local development (optional)

Install Node.js LTS and Wrangler, then from this folder:
```powershell
npx wrangler pages dev public --d1 DB=brilliantine-db
```
For local D1 schema initialization, use:
```powershell
npx wrangler d1 execute brilliantine-db --local --file=./schema.sql
```

## Project structure

```text
brilliantine-cloudflare/
  public/
    index.html
    styles.css
    app.js
    _routes.json
  functions/
    api/
      [[path]].js
  schema.sql
  wrangler.toml
  README-WINDOWS.md
```

## Production hardening recommended

For a public anonymous service, add Cloudflare rate limiting / WAF rules, abuse monitoring, database retention limits, and a privacy notice before broad release. Avoid storing personal information.
