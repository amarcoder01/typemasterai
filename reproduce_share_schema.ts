
import { insertSharedResultSchema } from "./shared/schema";

async function test() {
  console.log("Testing insertSharedResultSchema with edge cases...");

  // Case 1: Minimal valid data (without optional inferred fields like characters?)
  const minimalData = {
    shareToken: "abcdefghijkl",
    mode: "dictation",
    wpm: 45,
    accuracy: 98.5,
    errors: 1,
    // duration and characters are inferred from table columns. Are they required?
    // Table has them as nullable? No.
    // Let's check schema definition for table.
  };

  // Note: sharedResults table has duration and characters as nullable integer.
  // So schema should treat them as optional.
  
  const result1 = insertSharedResultSchema.safeParse(minimalData);
  console.log("Case 1 (Minimal):", result1.success ? "✅ Success" : "❌ Failed");
  if (!result1.success) console.log(JSON.stringify(result1.error.format(), null, 2));

  // Case 2: Null userId (anonymous share)
  const anonymousData = {
    ...minimalData,
    userId: null,
    isAnonymous: true,
  };
  const result2 = insertSharedResultSchema.safeParse(anonymousData);
  console.log("Case 2 (Anonymous/Null userId):", result2.success ? "✅ Success" : "❌ Failed");
  if (!result2.success) console.log(JSON.stringify(result2.error.format(), null, 2));

  // Case 3: Explicit Duration/Characters
  const fullData = {
    ...minimalData,
    userId: "user-123",
    duration: 120,
    characters: 500,
  };
  const result3 = insertSharedResultSchema.safeParse(fullData);
  console.log("Case 3 (Full):", result3.success ? "✅ Success" : "❌ Failed");

}

test().catch(console.error);
