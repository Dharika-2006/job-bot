# LinkedIn Job Bot

Automatically searches LinkedIn for Java Developer contract posts,
extracts recruiter emails, and sends your resume via Gmail.

## Setup
1. Run `npm install`
2. Create `.env` with your credentials
3. Add your `resume.pdf` to the project root
4. Run `node save-session.js` to save LinkedIn session
5. Run `node index.js` daily

## .env format
1. LINKEDIN_EMAIL=your@email.com
2. LINKEDIN_PASSWORD=yourpassword
3. GMAIL_USER=your@gmail.com
4. GMAIL_PASS=xxxx xxxx xxxx xxxx
