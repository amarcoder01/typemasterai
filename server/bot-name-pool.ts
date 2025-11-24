import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const POOL_SIZE = 100;
const REFRESH_THRESHOLD = 20;

class BotNamePool {
  private namePool: string[] = [];
  private usedNamesIndex: Set<number> = new Set();
  private isInitialized = false;
  private isRefreshing = false;

  async initialize() {
    if (this.isInitialized) return;
    
    console.log("[Bot Name Pool] Initializing with", POOL_SIZE, "realistic names...");
    this.namePool = await this.generateRealisticNames(POOL_SIZE);
    this.isInitialized = true;
    console.log("[Bot Name Pool] Ready with", this.namePool.length, "names");
  }

  private async generateRealisticNames(count: number): Promise<string[]> {
    const allNames: string[] = [];
    const batchSize = 20;
    
    for (let i = 0; i < count; i += batchSize) {
      const remaining = Math.min(batchSize, count - i);
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a creative username generator. Generate realistic usernames that real people would actually use online. Make them sound like REAL HUMANS, not obviously bots.",
            },
            {
              role: "user",
              content: `Generate ${remaining} unique, realistic usernames for online competitors. These should feel like REAL PEOPLE'S actual usernames. Include variety:
- Professional: alex_codes, sarah_dev, mike_w, emma_tech
- Casual: jenny2024, tomsmith, chris_j, lisa_m
- Gaming: NightRacer, ShadowKeys, StarPlayer, QuickDraw
- Creative: pixel_master, code_ninja, fast_typer, word_wizard
- International: yuki_san, maria_g, raj_kumar, anna_k, pedro_fast

Mix styles randomly. Keep them 5-15 characters. Make them feel authentic like real users from around the world. Return ONLY the usernames, one per line, no numbering or extra text.`,
            },
          ],
          temperature: 1.4,
          max_tokens: 400,
        });

        const names = response.choices[0].message.content
          ?.trim()
          .split("\n")
          .map(name => name.trim().replace(/[^a-zA-Z0-9_-]/g, ''))
          .filter(name => name.length >= 4 && name.length <= 16);

        if (names) {
          allNames.push(...names);
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error("[Bot Name Pool] Error generating batch:", error);
        // Add fallback names if API fails
        const fallbacks = this.generateFallbackNames(remaining);
        allNames.push(...fallbacks);
      }
    }

    // Remove duplicates and return
    return Array.from(new Set(allNames)).slice(0, count);
  }

  private generateFallbackNames(count: number): string[] {
    const firstNames = ["alex", "sarah", "mike", "emma", "john", "lisa", "david", "maria", "chris", "anna", "james", "kate"];
    const styles = ["_dev", "_pro", "_fast", "_code", "_type", "123", "2024", "_gamer", "_quick", "_star"];
    const names: string[] = [];

    for (let i = 0; i < count; i++) {
      const first = firstNames[Math.floor(Math.random() * firstNames.length)];
      const style = styles[Math.floor(Math.random() * styles.length)];
      names.push(`${first}${style}`);
    }

    return names;
  }

  getRandomNames(count: number): string[] {
    if (!this.isInitialized || this.namePool.length === 0) {
      console.warn("[Bot Name Pool] Not initialized, using fallback names");
      return this.generateFallbackNames(count);
    }

    const selected: string[] = [];
    const availableIndices = this.namePool
      .map((_, index) => index)
      .filter(index => !this.usedNamesIndex.has(index));

    // If we've used too many names, reset the used set
    if (availableIndices.length < count) {
      this.usedNamesIndex.clear();
      availableIndices.push(...this.namePool.map((_, index) => index));
    }

    // Randomly select from available names
    for (let i = 0; i < count && availableIndices.length > 0; i++) {
      const randomIdx = Math.floor(Math.random() * availableIndices.length);
      const nameIndex = availableIndices[randomIdx];
      
      selected.push(this.namePool[nameIndex]);
      this.usedNamesIndex.add(nameIndex);
      availableIndices.splice(randomIdx, 1);
    }

    // Trigger background refresh if running low
    if (this.usedNamesIndex.size > POOL_SIZE - REFRESH_THRESHOLD && !this.isRefreshing) {
      this.refreshPoolInBackground();
    }

    return selected;
  }

  private async refreshPoolInBackground() {
    this.isRefreshing = true;
    console.log("[Bot Name Pool] Refreshing pool in background...");
    
    try {
      const newNames = await this.generateRealisticNames(POOL_SIZE);
      this.namePool = newNames;
      this.usedNamesIndex.clear();
      console.log("[Bot Name Pool] Successfully refreshed with", newNames.length, "new names");
    } catch (error) {
      console.error("[Bot Name Pool] Failed to refresh pool:", error);
    } finally {
      this.isRefreshing = false;
    }
  }
}

export const botNamePool = new BotNamePool();
