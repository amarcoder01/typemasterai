I will fix the navigation issue by moving the URL state management from a reactive `useEffect` to explicit navigation actions. This ensures that the browser history is correctly updated *before* the UI changes, guaranteeing that the "Back" button works as expected.

### **Plan**
1.  **Remove Reactive History Syncing:** Delete the `useEffect` block that currently attempts to sync state changes to the URL. This removes the ambiguity of when the URL updates.
2.  **Implement Explicit Navigation:**
    *   Update `handleStartPracticeMode` to explicitly call `window.history.pushState` with the new mode parameter. This ensures a new history entry is created whenever a user starts a practice session.
    *   Update the "Exit" / "Back" UI buttons to explicitly clean the URL (remove the query parameter) in addition to updating the UI state.
3.  **Enhance `popstate` Listener:** ensure the browser's "Back" button event (`popstate`) correctly detects the absence of the `mode` parameter and forces the UI back to the Selector screen.

### **Verification**
*   **User Flow:** Start at Selector -> Click "Quick Practice" -> Verify URL is `?mode=quick` -> Click Browser Back -> Verify URL is clean -> Verify UI shows Selector.
*   **Deep Linking:** Load `?mode=quick` directly -> Verify Practice Mode starts -> Click Browser Back -> Verify behavior (should exit or handle gracefully depending on history).

This approach makes the navigation deterministic and resolves the issue where the history entry was likely being skipped or replaced.