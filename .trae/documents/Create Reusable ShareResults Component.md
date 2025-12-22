I will create a standalone, reusable `ShareResults` component that exactly replicates the sharing functionality and UI of the Standard Quick Test.

**Plan:**

1. **Create** **`client/src/components/ShareResults.tsx`**:

   * This component will encapsulate all social sharing buttons (Twitter, Facebook, LinkedIn, WhatsApp, Telegram, Reddit, Email).

   * It will accept props for `wpm`, `accuracy`, and `mode` (test duration) to generate dynamic sharing messages.

   * I will include the `getPerformanceRating` helper logic internally to ensure it produces the exact same badges (🏆, ⚡, 🔥) and titles as the standard mode.

   * It will feature the exact same grid layout and button styling (colors, icons, hover effects) as the code I analyzed in `typing-test.tsx`.

2. **Verification**:

   * I will ensure the component is self-contained and ready for future integration, but I will **not** modify any existing files or import it anywhere yet, strictly following your instruction to "keep it separate."

