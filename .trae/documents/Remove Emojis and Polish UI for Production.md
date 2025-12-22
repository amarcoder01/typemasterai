I will proceed with removing non-standard emojis and symbols from the Dictation Mode components to ensure a more professional and production-ready appearance, as requested. I will replace them with high-quality Lucide icons which are already used throughout the application.

**Plan:**

1.  **Refactor `DictationSessionComplete.tsx`:**
    *   Remove emojis from the `getDictationPerformanceRating` function (🏆, ⚡, 🔥, ✨, 🌱) and replace them with appropriate Lucide icons or remove them if redundant.
    *   Remove emojis from the "Fun Stat" section (🔥, ⚡, 🎉, 🌟) and use standard icons.
    *   Ensure the visual layout remains consistent using Lucide icons.

2.  **Refactor `DictationShareDialog.tsx`:**
    *   Remove emojis from `quickShareText` (🔥, ⚡, 🎉, 🌟, ⏱️, 🚀) to ensure the shared text is clean and universally readable.
    *   Standardize the text formatting.

3.  **Refactor `DictationModeSelector.tsx`:**
    *   Remove the headphone emoji 🎧 from the title.
    *   Check for any other loose emojis in tooltips or descriptions.

4.  **Refactor `types.ts`:**
    *   Update `getDifficultyEmoji` to return empty strings or remove it entirely if it's only used for emojis (🟢, 🟡, 🔴). If used for UI color coding, I'll switch to CSS classes.

5.  **Refactor `utils/scoring.ts`:**
    *   (Checked: No emojis found in the provided snippet, but I will double-check during implementation).

**Note on Shared Component:**
Regarding your suggestion to "develop a separate share component," **YES**, we can and should do that. I will create a reusable `ShareResults` component that consolidates the logic from `DictationShareDialog`, `ShareModal`, and the Code Mode sharing logic. This will ensure consistent UI and behavior across the app. I will implement this *after* cleaning up the emojis, as part of the production-readiness pass.

For this immediate step, I will focus on the emoji cleanup.