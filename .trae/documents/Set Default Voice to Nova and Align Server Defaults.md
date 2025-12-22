I will fix the issue where the final result comparison is skipped when completing the last sentence of a dictation session.

**The Problem:**
The `handleTestComplete` logic in `DictationContext.tsx` immediately marks the session as complete (`SET_SESSION_COMPLETE`) when the progress count reaches the total session length. This triggers the main component to switch views to the "Session Complete" summary screen instantly, bypassing the `DictationResults` screen for the final sentence.

**The Fix:**
1.  **Modify `DictationContext.tsx`**: I will remove the logic that sets `sessionComplete = true` inside `handleTestComplete`. This responsibility should belong to the user's explicit action (clicking "Next") or the auto-advance timer.
2.  **Verify `DictationModeContent`**: The `handleNextSentence` function in `client/src/pages/dictation-mode.tsx` already has the correct logic to check if `sessionProgress >= sessionLength` and *then* set `sessionComplete = true`. This logic is currently redundant but will become the primary trigger once I remove the premature check from the context.
3.  **Update `DictationResults.tsx`**: I will update the "Next Sentence" button label to say "Finish Session" when it is the last sentence, to make it clear to the user that clicking it will end the session.

**Plan:**
1.  **Edit `client/src/features/dictation/context/DictationContext.tsx`**: Remove the `if (state.sessionProgress + 1 >= state.sessionLength)` block from `handleTestComplete`.
2.  **Edit `client/src/features/dictation/components/DictationResults.tsx`**: Add a prop `isLastSentence` and conditionally render the button text as "Finish Session" vs "Next Sentence".
3.  **Edit `client/src/pages/dictation-mode.tsx`**: Pass the `isLastSentence` prop to `DictationResults`.

This ensures the user always sees the detailed breakdown of their last sentence before moving to the final summary.