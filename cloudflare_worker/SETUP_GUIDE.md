# ☁️ Cloudflare Worker Setup for PhantomSync (2-Minute Guide)

This Cloudflare Worker is your secure backend that holds your Google Gemini API key in secret and powers the **PhantomSync AI Generator** for every visitor without anyone ever needing an API key!

---

### Step 1: Create the Worker in Cloudflare (60 Seconds)
1. Log into your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. On the left sidebar, click **Workers & Pages** &rarr; click **Create Application** &rarr; **Create Worker**.
3. Name your worker: `phantomsync-api` (or any name you like).
4. Click **Deploy**.

---

### Step 2: Paste the Code
1. On the Worker summary page, click **Edit Code** (top right).
2. Delete whatever template code is in `worker.js`.
3. Open `cloudflare_worker/worker.js` from this folder, copy all the code, and paste it into the Cloudflare online code editor.
4. Click **Save and Deploy** (top right).

---

### Step 3: Add Your Gemini API Key Secret
1. In Cloudflare, go back to your Worker's main page.
2. Click the **Settings** tab &rarr; select **Variables and Secrets** (or **Variables**).
3. Under **Environment Variables**, click **Add**:
   * **Variable name:** `GEMINI_API_KEY`
   * **Value:** *(Paste your Google Gemini API key here)*
   * Click **Encrypt** (lock icon) so it's hidden securely.
4. Click **Save and Deploy**.

---

### Step 4: Plug it into PhantomSync Studio!
1. Copy your worker's live public URL (e.g. `https://phantomsync-api.your-subdomain.workers.dev`).
2. Open **[PhantomSync Studio](https://dynofusion.github.io/Card/phantomsync_studio.html)**.
3. Click **⚙️ Backend & AI Settings**.
4. Paste your Worker URL into **Cloudflare Worker URL**.

🎉 **That's it!** Your PhantomSync Studio will now automatically route all AI generations through your Cloudflare edge backend with 100% security, zero API key popups, and multi-model fallback!
