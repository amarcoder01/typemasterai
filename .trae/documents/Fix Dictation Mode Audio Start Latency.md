## Diagnosis
- Primary delay sources:
  - `800ms` artificial delay before speaking in `client/src/pages/dictation-mode.tsx:354–359`.
  - OpenAI TTS response is downloaded fully as a Blob before playback (`client/src/hooks/useSpeechSynthesis.ts:168–191`), blocking start by ~2–5s.
  - First-use browser voice initialization may add ~0.5–1s (`client/src/hooks/useSpeechSynthesis.ts:94–133`).
  - Sentence fetch adds a network round-trip prior to speech (`client/src/features/dictation/hooks/useDictationAPI.ts:84–107`).

## Objectives
1. Start audio within ~1s of tapping Start Session.
2. Preserve existing features (replay, timer on speech end, adaptive difficulty, fallback TTS).
3. Maintain reliability across OpenAI TTS and browser TTS fallback.

## Changes
### 1) Remove pre-speak delay
- Update `loadNextSentence` to speak immediately after sentence is set.
- File: `client/src/pages/dictation-mode.tsx:354–359`.
- Rationale: Eliminates unnecessary 800ms wait without affecting timer (which begins on `onSpeechEnd` at `client/src/pages/dictation-mode.tsx:95–103`).

### 2) Stream TTS from server
- Modify `/api/dictation/tts` to stream audio instead of buffering entire MP3.
- File: `server/routes.ts:3964–3996`.
- Implementation:
  - Use `response.body` (ReadableStream) from OpenAI and pipe to Express response.
  - Set `Content-Type: audio/mpeg` and omit `Content-Length` to enable `Transfer-Encoding: chunked`.
  - Keep status and error handling consistent; still return `{ fallback: true }` when OpenAI unavailable.
- Benefit: Client can begin playback as bytes arrive, reducing perceived start time.

### 3) Client streaming playback path
- Replace Blob-based playback with streaming playback for OpenAI mode.
- File: `client/src/hooks/useSpeechSynthesis.ts:145–197`.
- Implementation options:
  - A) Simple: introduce GET route `/api/dictation/tts-stream?text=...&voice=...&speed=...` that streams; set `audio.src` to that URL and call `audio.play()`.
  - B) Advanced: keep POST and use `MediaSource` to feed chunks; more complex, so prefer (A) for reliability.
- Fallback remains unchanged: on non-200 or `{ fallback: true }`, immediately call `speakWithBrowser` (`client/src/hooks/useSpeechSynthesis.ts:296–304`).

### 4) Prefetch the first sentence
- When entering waiting state, prefetch first sentence and store it in context.
- Files:
  - `client/src/features/dictation/context/DictationContext.tsx:348–359` (after `startPracticeMode`), trigger a prefetch via `useDictationAPI.fetchSentence`.
  - Use context to hold a `prefetchedSentence` and consume it in `handleBeginSession` (`client/src/pages/dictation-mode.tsx:321–324`).
- Benefit: Removes sentence-fetch round-trip on Start, making TTS request the only network step.

### 5) Voice preload stability
- Ensure voices are loaded before first speak.
- Files: `client/src/hooks/useSpeechSynthesis.ts:94–133`.
- Implementation: call `window.speechSynthesis.getVoices()` once on mode selection; the existing mount logic already does this but we’ll trigger it earlier by instantiating the audio hook in the waiting screen (it already is, via `DictationModeContent`).

### 6) Faster fallback on OpenAI errors
- Add a short timeout (e.g., 4s) to OpenAI fetch in `speakWithOpenAI` with `AbortController` and fallback immediately to browser TTS.
- File: `client/src/hooks/useSpeechSynthesis.ts:150–158`.
- Benefit: Avoids long waits when OpenAI is slow or unavailable.

### 7) Server-side TTS cache (optional but safe)
- Add a small in-memory cache keyed by `(text, voice, speed)` with TTL (e.g., 24h) to skip regenerating identical audio.
- File: `server/routes.ts` (near `/api/dictation/tts`).
- Benefit: Eliminates generation latency for repeated sentences and replays.

## Verification
- Manual test:
  - Start a session and measure time from tap to first audio frame; target <1s with streaming.
  - Verify timer starts on speech end and WPM/accuracy calculations remain correct.
  - Test replay, hints, auto-advance, bookmarks.
  - Unset `OPENAI_TTS_API_KEY` to confirm browser fallback starts promptly.
- Regression scan:
  - Confirm `actions.beginSession` and `loadNextSentence` flow unchanged except for delay removal.
  - Validate no changes to persistence, adaptive difficulty, or certificate generation.

## Rollback Strategy
- Keep feature flags for streaming route and prefetch; allow toggling back to Blob path if needed.
- Minimal, isolated edits with clear guards ensure easy revert.

## Deliverables
- Updated `dictation-mode.tsx`, `useSpeechSynthesis.ts`, and `server/routes.ts` with streaming playback, removed delay, optional cache, and faster fallback.
- Notes documenting new `/api/dictation/tts-stream` (if used) and behavior.
