I have analyzed the codebase and identified that the issue stems from the **OpenAI TTS service failing** (likely due to a missing API key or connection issue, as seen in the logs: `503 TTS not available`). When this happens, the system silently falls back to the browser's default system voice ("Microsoft David" or similar), but the UI still shows the OpenAI voice selector ("Alloy", "Nova", etc.). Because the fallback mechanism is active, changing the selection in the dropdown has no effect on the audio output, confusing the user.

To fix this, I will implement a "Graceful Fallback" strategy that updates the UI to reflect reality.

**Plan:**
1.  **Update `useSpeechSynthesis.ts`**: Modify the `speak` function to automatically disable the "Use OpenAI" flag (`isUsingOpenAI = false`) if the server returns a fallback/error response. This ensures the application state matches the actual behavior.
2.  **Update `DictationSetupPanel.tsx`**:
    *   Add support for browser-native voices (`voices`, `currentVoice`, `onVoiceChange`) to the component props.
    *   Modify the "Voice Style" selector to be dynamic:
        *   If OpenAI TTS is active, show the premium voices (Alloy, Nova, etc.).
        *   If OpenAI TTS is inactive (or fell back), show the available system voices (Google US English, Microsoft Zira, etc.).
3.  **Update `DictationMode.tsx`**: Wire up the necessary browser voice data (`audio.englishVoices`, `audio.currentVoice`, `audio.setVoice`) from the `useDictationAudio` hook to the `DictationSetupPanel`.

**Outcome:**
If the premium voice fails, the system will automatically switch to system voices, *and* the dropdown will update to let you select which system voice you want to use. This fixes the "broken selector" feeling.