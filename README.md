# recruiter-radar

> Find recruiters on LinkedIn. Send resume. Get hired.

Automatically searches LinkedIn for Java Developer contract posts, extracts recruiter emails, and sends your resume via Gmail — all in one command.

---

## Project Structure

```
recruiter-radar/
│
├── index.js              # Main bot — runs the full pipeline
├── save-session.js       # Run once to save LinkedIn login session
│
├── utils/
│   └── extractEmail.js   # Extracts email addresses from post text
│
├── .env                  # Your credentials (never commit this)
├── .gitignore            # Excludes .env, session.json, resume.pdf
├── session.json          # Auto-generated LinkedIn session (never commit)
├── resume.pdf            # Your resume (never commit)
├── package.json          # Node dependencies
└── README.md             # This file
```

---

## Setup

**1. Install dependencies**
```bash
npm install
```

**2. Create your `.env` file**
```env
LINKEDIN_EMAIL=your@email.com
LINKEDIN_PASSWORD=yourpassword
GMAIL_USER=your@gmail.com
GMAIL_PASS=xxxx xxxx xxxx xxxx
```
> `GMAIL_PASS` must be a **Gmail App Password**, not your regular Gmail password.
> Generate one at: https://myaccount.google.com/apppasswords

**3. Add your resume**

Place your resume in the project root and name it:
```
resume.pdf
```

**4. Save your LinkedIn session (run once)**
```bash
node save-session.js
```
A browser window will open — log in manually, then press ENTER. Your session is saved to `session.json`.

---

## Usage

```bash
node index.js
```

Run this daily to catch the latest recruiter posts.

---

## How It Works

```
1. Load saved LinkedIn session
2. Search Posts: "hiring java developer contract gmail.com" (sorted by date)
3. Scroll and load posts
4. Expand each post by clicking "...more"
5. Filter posts from last 24 hours only
6. Extract recruiter email addresses
7. Send resume via Gmail SMTP to each recruiter
```

---

## Dependencies

| Package | Purpose |
|---|---|
| `playwright` | Browser automation (LinkedIn) |
| `nodemailer` | Send emails via Gmail SMTP |
| `dotenv` | Load credentials from `.env` |

---

## Security Notes

- Never commit `.env` — it contains your passwords
- Never commit `session.json` — it contains your LinkedIn session cookies
- Keep this repo **Private** on GitHub
- All sensitive files are excluded via `.gitignore`

---

## Session Expired?

If LinkedIn logs you out, just re-run:
```bash
node save-session.js
```
