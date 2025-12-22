I will enhance the "Waiting to Start" screen in Dictation Mode to provide a comprehensive setup experience before the session begins. Instead of just a "Start" button, users will see a full configuration panel.

### **Plan**
1.  **Create `DictationSetupPanel` Component:**
    *   This new component will live in `client/src/features/dictation/components/DictationSetupPanel.tsx`.
    *   It will expose all relevant settings that users might want to tweak *before* starting:
        *   **Difficulty:** Easy/Medium/Hard selector.
        *   **Topic/Category:** Dropdown for selecting content themes.
        *   **Voice Settings:** Speed slider (0.5x - 2.0x) and Voice Style selector (OpenAI voices).
        *   **Session Length:** Slider or input to define how many sentences to practice (e.g., 5, 10, 20).
        *   **Adaptive Difficulty:** Toggle switch to enable/disable auto-adjustment.

2.  **Integrate into `dictation-mode.tsx`:**
    *   Replace the current simple "Ready to begin?" card with this new `DictationSetupPanel`.
    *   Connect the panel's inputs to the existing `useDictation` context actions (`dispatch`) so state updates immediately.

3.  **UI/UX Improvements:**
    *   Use a clean, grid-based layout (using `Card`, `Select`, `Slider` from shadcn/ui).
    *   Add a "Estimated Duration" display based on the selected session length and speed.
    *   Keep the "Start Session" button prominent but now context-aware of the settings.

### **Verification**
*   **Visual Check:** Verify the new panel appears after selecting a mode.
*   **Functional Check:** Change settings (e.g., set speed to 1.5x, topic to "Science") and click Start.
*   **Result:** Verify the session actually starts with those specific settings applied (e.g., the first sentence matches the topic, audio plays at 1.5x).