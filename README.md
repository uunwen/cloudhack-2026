# Lore Drop 🎧

Turn your lecture slides, notes, or readings into a gossip podcast episode you'll actually want to listen to — then get quizzed on it before the tea has time to go cold.

## The problem

Nobody re-reads their lecture slides before an exam. Dense, dry source material is easy to skip and hard to retain. Lore Drop takes whatever you were supposed to study — a PDF, a slide deck, a Word doc, a photo of a whiteboard, or just pasted notes — and turns it into a short, genre-flavored two-host audio episode (gossip podcast, true crime, sports commentary, Gen-Z slang explainer, reality TV drama), dramatizing the *delivery* while keeping every fact intact. A webcam-based attention check gently roasts you if you drift off or start doom-scrolling mid-episode, and a lightning-round quiz plus session recap closes the loop on whether it actually stuck. Text-to-podcast tools exist, and study-quiz tools exist, but usually as separate apps that don't talk to each other — what's distinct here is pairing dramatized-but-accurate delivery with an active, webcam-enforced attention check and a voice-enabled grounded Q&A layer, all operating on the exact same uploaded material in one flow.

## How it works

Everything starts on the **landing page** — a quick, tongue-in-cheek explainer of what Lore Drop does and why, before dropping you into the real flow.

1. **Upload** — drop in a PDF/PPTX/DOCX/image, or paste text directly.
2. **Pick a genre** — five tonally distinct styles to rewrite the material as a two-host dialogue.
3. **Listen** — a synced, karaoke-style transcript plays alongside real host audio, with adjustable playback speed (1x/1.5x/2x). A transcript panel and an AI-generated summary panel are both visible at once, stacked and independently scrollable, so there's no toggling between them.
4. **Stay honest** — an entirely client-side webcam check (nothing ever leaves your browser) notices if you wander off or start scrolling your phone, pauses the episode, and calls you out in-voice.
5. **Get quizzed** — a 5-question lightning round on the actual source material, then a recap card with your score, streak, focus time, and how many times you got caught slipping.

Two more things live alongside that core loop:

- **Ask your notes** — a grounded Q&A chatbot over whatever you uploaded. It resolves references like "chapter 3" or "slide 12," retrieves the matching excerpts, answers strictly from that material via OpenAI, and shows exactly which section(s) the answer is sourced from. Questions can be typed or spoken (recorded in the browser and transcribed via OpenAI Whisper before you review and send them), and any answer can be played back as speech via ElevenLabs, with a play/pause button per response. Fully wired end to end, not a mockup.
- **My sessions** — a session-history dashboard (stats plus a list of past episodes). It currently runs on hardcoded demo data for presentation purposes only — Lore Drop doesn't yet persist real session history.

## User journey

It's finals week and there's a 40-slide lecture deck a student has been avoiding for days. They land on Lore Drop, drop the deck in, and pick "gossip podcast" because true crime felt like too much commitment. A minute later, two hosts are dragging mitochondria like it's a group chat scandal, a karaoke-style transcript highlights along with the audio, and a live summary sits right underneath in case they lose the thread. Partway through, they glance at their phone — the webcam notices, pauses the episode, and the hosts call them out before letting them keep listening. At the end, a five-question lightning round checks what actually stuck, followed by a recap card with their score, focus time, and exactly how many times they got caught slipping. If something's still unclear afterward, they can type a follow-up into "Ask your notes," or just talk to it and let Whisper turn their voice into a question, then have the answer read back out loud instead of read.

## Screenshots

| Landing | Player | Quiz |
|---|---|---|
| ![Landing page](docs/screenshots/landing.png) | ![Player with karaoke transcript](docs/screenshots/player.png) | ![Quiz lightning round](docs/screenshots/quiz.png) |

## Tech stack

- **Frontend**: React + TypeScript, Vite, Tailwind CSS, React Router, react-markdown (renders the notes chatbot's answers)
- **Backend**: Node.js + Express (thin API layer, no database — everything is session-scoped in React context)
- **AI/ML**: [OpenAI](https://openai.com) (GPT-4o) for genre-dialogue rewriting, summaries, and quiz generation via Structured Outputs, a grounded chat completion for the notes Q&A chatbot, and Whisper for transcribing spoken questions; [ElevenLabs](https://elevenlabs.io) for two-host text-to-speech plus a third voice for spoken chatbot answers; [MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker) (on-device, in-browser) for the webcam attention check

### Sponsor tools used

- **OpenAI** — script/dialogue generation, AI summaries, and quiz question generation (all via Structured Outputs for reliable, parseable results), the "Ask your notes" chatbot's grounded answers, and Whisper transcription for voice questions
- **ElevenLabs** — text-to-speech for both podcast hosts, a separate single voice for spoken chatbot answers, and a small pre-generated library of "caught you" roast lines used by the attention-check feature

## Technical highlights

- **Multi-format ingestion** — PDFs, PPTX, DOCX, images, and pasted text each go through a dedicated extractor (`pdfjs-dist`, `officeparser`, `mammoth`, GPT-4o vision) but all converge on one common section shape (title, body text, optional notes/heading path) before anything downstream sees them. Scanned or image-only PDFs are detected automatically by average extracted characters per page and fall back to rendering each page as an image and reading it with GPT-4o vision instead of the (empty) text layer.
- **Chunked, continuity-aware generation** — source material is split into character-budgeted chunks and scripted sequentially rather than in one call, with each chunk's prompt carrying the last few lines of the previous chunk's dialogue plus an explicit next-speaker instruction, so a long lecture deck reads as one continuous two-host conversation instead of stitched-together fragments and never silently loses coverage of later content. Quiz generation applies the same idea in reverse: sections are split into up to five evenly-sized buckets and the five questions are distributed across them, so coverage spans the whole document instead of concentrating on whatever came first.
- **Text-to-speech pipeline** — the podcast uses two distinct ElevenLabs voices, one per host, synthesized per dialogue line with bounded concurrency (four lines at a time), an in-memory cache keyed by voice and text so repeated lines are free, and a retry-once-then-fail-with-detail policy so one bad line surfaces a clear error instead of corrupting the episode. The notes chatbot reuses the same ElevenLabs client with a single separate voice for spoken answers.
- **Speech-to-text for voice questions** — the "Ask your notes" mic records locally in the browser via the MediaRecorder API and uploads the clip to a dedicated endpoint that transcribes it with OpenAI Whisper. The result lands in the text box for the student to review or edit, never auto-sent.
- **Grounded chatbot retrieval** — a question is first resolved against the uploaded material with pattern-based scope detection (chapter, page, slide, section, or heading references), then scored with keyword term-frequency matching across chunked sections, and only the top-matching excerpts are handed to the model with an explicit instruction to answer only from them. Every answer returns the section(s) it was pulled from so it can be cited back to the student, and if nothing scores well enough it says so instead of guessing.
- **On-device attention detection** — the webcam check runs MediaPipe's Face Landmarker entirely in the browser via WASM, estimating head pitch from the returned facial transformation matrix to detect sustained "looking away" or "looking down" states. No frame or video data is ever sent to a server.
- **Synced playback** — each script line has its own audio clip, and the player only advances to the next line once the current clip finishes playing. The transcript highlight tracks that same line index and auto-scrolls it into view, so the karaoke effect stays frame-accurate to what's actually playing instead of running on an independent timer.

## Why this matters

Self-study usually fails not from a lack of material but because dense material doesn't hold attention long enough for anything to stick — dramatized-but-fact-preserving delivery plus an attention check that actually pauses playback when you look away targets that failure point directly, rather than being a novelty layered on top of it. Every piece involved (document parsing, LLM-driven dramatization, per-line TTS, on-device face-pose detection, retrieval-grounded Q&A, speech-to-text) is production-ready technology available today, not a speculative research demo. There's also no database to work around for the core loop, so scaling this into a real product is a matter of tuning cost and latency, not a fundamental rework of the architecture.

## Project structure

- `client/` — Vite + React + TypeScript + Tailwind CSS frontend
- `server/` — thin Express API server (`server/lib/` holds the OpenAI/ElevenLabs integration logic — script generation, summaries, quiz generation, text-to-speech, and a lightweight keyword-based retrieval layer that grounds the notes chatbot; `server/routes/` the HTTP layer; `server/scripts/` one-off content-generation scripts used during development)

## How to run locally

1. Install dependencies for both apps:

   ```
   npm run install:all
   ```

2. Set up backend environment variables:

   ```
   cp server/.env.example server/.env
   ```

   Then fill in `OPENAI_API_KEY` and `ELEVENLABS_API_KEY` in `server/.env`.

3. Start both dev servers concurrently:

   ```
   npm run dev
   ```

   - Frontend: http://localhost:5173
   - Backend health check: http://localhost:3001/api/health

### No API keys handy, or flaky wifi?

The Upload page has three "jump straight to a demo episode" links that load a fully pre-generated episode (script, audio, summary, and quiz) from a static file, with **zero** API calls — useful for a live demo if the network or an API is having a bad day.
