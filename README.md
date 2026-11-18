# Saarthi

Run it:

    export GEMINI_API_KEY=your-key        # from https://aistudio.google.com (or set ANTHROPIC_API_KEY instead)
    python server.py                      # then open http://127.0.0.1:8000

On Windows PowerShell: `$env:GEMINI_API_KEY="your-key"; python server.py`

No dependencies are needed (standard library only). The AI key turns on:
- **Read Photo or PDF**: a plain summary of a photo or PDF.
- **Easy Medical Words**: a full plain-language explanation of a pasted report or prescription.

Without a key, Easy Medical Words still changes common short forms (Tab, BD, OD...) using its built-in word list,
and the Read page falls back to a basic summary if you install `requirements.txt` (and the `tesseract` program for photos).
The startup line tells you which mode is on, for example `AI on: gemini`.

## Layout
    server.py      backend: static files + POST /api/summarize + POST /api/simplify + GET /api/health
    static/        the site (index, home, speak, read, simplify, care, women .html)
      i18n.js      every visible word in English, Hindi, Bengali, Marathi, Tamil
      app.js       settings, language, nav, SOS, Talk & Listen, Read, Easy Medical Words
      care.js      Daily Health Care (7 tools)      women.js   Women's Health (7 tools)
      assets/      the six cropped banners, plus a blue-amber version of each for colour-safe mode

## API
POST /api/simplify   JSON {"text": "...", "lang": "en|hi|bn|mr|ta"}, text up to 5000 characters
  200 {"text": "...", "mode": "ai"}
  400 empty/bad_type, 413 too_big, 422 not_medical, 429 rate_limited, 503 not_configured, 502/500 failed
  Medicine names, doses, timings and test values are kept exactly as written; the page also lists the doses
  straight from the pasted text, so they never depend on the AI.

POST /api/summarize  multipart: `file` (PNG/JPEG/WebP/PDF, max 5 MB), `lang` (en|hi|bn|mr|ta)
  200 {"summary": "...", "mode": "ai"|"basic"}
  400 bad_type, 413 too_big, 422 unreadable, 429 rate_limited, 503 not_configured, 502/500 failed

File type is checked from the file's own bytes. Files and pasted text are processed in memory and never stored or logged.
Both AI routes share one rate limit (RATE_PER_MINUTE per address). The page says when text is sent to the AI service.
Everything else (account, reminders, readings, diary) stays in the browser on the user's device.
Behind a proxy, set TRUST_PROXY=1 so the rate limit sees the real address, and serve over HTTPS
(the microphone and location need it outside localhost).
