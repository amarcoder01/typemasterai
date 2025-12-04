import { storage } from "./storage";
import type { UserRating, RaceParticipant } from "@shared/schema";

interface RaceResult {
  participantId: number;
  userId: string | null;
  position: number;
  wpm: number;
  accuracy: number;
  isBot: boolean;
}

interface RatingChange {
  userId: string;
  oldRating: number;
  newRating: number;
  change: number;
  tier: string;
  isProvisional: boolean;
}

const processedRaces = new Map<number, number>();
const PROCESSED_RACE_TTL = 60 * 60 * 1000;

function cleanupProcessedRaces() {
  const now = Date.now();
  for (const [raceId, timestamp] of processedRaces.entries()) {
    if (now - timestamp > PROCESSED_RACE_TTL) {
      processedRaces.delete(raceId);
    }
  }
}

setInterval(cleanupProcessedRaces, 5 * 60 * 1000);

const TIER_THRESHOLDS = {
  grandmaster: 2400,
  master: 2100,
  diamond: 1800,
  platinum: 1500,
  gold: 1300,
  silver: 1100,
  bronze: 0,
} as const;

const K_FACTOR = {
  provisional: 64,
  regular: 32,
  established: 24,
} as const;

export class EloRatingService {
  private calculateExpectedScore(playerRating: number, opponentRating: number): number {
    return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  }

  private getKFactor(rating: UserRating): number {
    if (rating.isProvisional) {
      return K_FACTOR.provisional;
    }
    if (rating.totalRaces < 50) {
      return K_FACTOR.regular;
    }
    return K_FACTOR.established;
  }

  private getTierForRating(rating: number): string {
    if (rating >= TIER_THRESHOLDS.grandmaster) return "grandmaster";
    if (rating >= TIER_THRESHOLDS.master) return "master";
    if (rating >= TIER_THRESHOLDS.diamond) return "diamond";
    if (rating >= TIER_THRESHOLDS.platinum) return "platinum";
    if (rating >= TIER_THRESHOLDS.gold) return "gold";
    if (rating >= TIER_THRESHOLDS.silver) return "silver";
    return "bronze";
  }

  private calculateMultiplayerScore(position: number, totalPlayers: number): number {
    if (totalPlayers < 2) return 0.5;
    return (totalPlayers - position) / (totalPlayers - 1);
  }

  async processRaceResults(raceId: number, results: RaceResult[]): Promise<RatingChange[]> {
    if (processedRaces.has(raceId)) {
      console.log(`[ELO] Race ${raceId} already processed, skipping duplicate`);
      return [];
    }
    
    const existingHistory = await storage.getRaceMatchHistory(raceId);
    if (existingHistory.length > 0) {
      console.log(`[ELO] Race ${raceId} match history exists, skipping duplicate`);
      processedRaces.set(raceId, Date.now());
      return [];
    }
    
    processedRaces.set(raceId, Date.now());
    
    const humanResults = results.filter(r => !r.isBot && r.userId);
    
    if (humanResults.length < 2) {
      console.log("[ELO] Not enough human players to calculate rating changes");
      return [];
    }

    const ratingChanges: RatingChange[] = [];
    const playerRatings: Map<string, UserRating> = new Map();
    
    for (const result of humanResults) {
      if (result.userId) {
        const rating = await storage.getOrCreateUserRating(result.userId);
        playerRatings.set(result.userId, rating);
      }
    }

    const totalPlayers = humanResults.length;
    const avgRating = Array.from(playerRatings.values()).reduce((sum, r) => sum + r.rating, 0) / totalPlayers;

    for (const result of humanResults) {
      if (!result.userId) continue;
      
      const playerRating = playerRatings.get(result.userId);
      if (!playerRating) continue;

      const actualScore = this.calculateMultiplayerScore(result.position, totalPlayers);
      
      let expectedScore = 0;
      const entries = Array.from(playerRatings.entries());
      for (const [opponentId, opponentRating] of entries) {
        if (opponentId !== result.userId) {
          expectedScore += this.calculateExpectedScore(playerRating.rating, opponentRating.rating);
        }
      }
      expectedScore /= (totalPlayers - 1);

      const K = this.getKFactor(playerRating);
      const ratingChange = Math.round(K * (actualScore - expectedScore));
      const newRating = Math.max(100, Math.min(3000, playerRating.rating + ratingChange));
      
      const isWin = result.position === 1;
      const isLoss = result.position === totalPlayers;
      const isDraw = !isWin && !isLoss && totalPlayers > 2;

      const newWinStreak = isWin ? playerRating.winStreak + 1 : 0;
      const newBestWinStreak = Math.max(playerRating.bestWinStreak, newWinStreak);
      
      const newTier = this.getTierForRating(newRating);
      const newPeakRating = Math.max(playerRating.peakRating, newRating);
      const newProvisionalGames = playerRating.provisionalGames + 1;
      const isStillProvisional = newProvisionalGames < 10;

      await storage.updateUserRating(result.userId, {
        rating: newRating,
        peakRating: newPeakRating,
        tier: newTier,
        totalRaces: playerRating.totalRaces + 1,
        wins: playerRating.wins + (isWin ? 1 : 0),
        losses: playerRating.losses + (isLoss ? 1 : 0),
        draws: playerRating.draws + (isDraw ? 1 : 0),
        winStreak: newWinStreak,
        bestWinStreak: newBestWinStreak,
        isProvisional: isStillProvisional,
        provisionalGames: newProvisionalGames,
        lastRaceAt: new Date(),
      });

      await storage.createRaceMatchHistory({
        raceId,
        participantId: result.participantId,
        userId: result.userId,
        finishPosition: result.position,
        wpm: result.wpm,
        accuracy: result.accuracy,
        ratingBefore: playerRating.rating,
        ratingAfter: newRating,
        ratingChange: ratingChange,
        opponentCount: totalPlayers - 1,
        avgOpponentRating: Math.round(avgRating),
      });

      ratingChanges.push({
        userId: result.userId,
        oldRating: playerRating.rating,
        newRating,
        change: ratingChange,
        tier: newTier,
        isProvisional: isStillProvisional,
      });
    }

    return ratingChanges;
  }

  async getMatchmakingPool(userId: string, tolerance: number = 200): Promise<UserRating[]> {
    const userRating = await storage.getOrCreateUserRating(userId);
    return storage.getUsersForMatchmaking(userRating.rating, tolerance, [userId]);
  }

  async applyRatingDecay(userId: string, daysInactive: number): Promise<number> {
    if (daysInactive < 14) return 0;
    
    const rating = await storage.getUserRating(userId);
    if (!rating) return 0;

    const DECAY_PER_WEEK = 25;
    const DECAY_CAP = 200;
    const MIN_RATING = 1000;

    const weeksInactive = Math.floor((daysInactive - 14) / 7);
    const decayAmount = Math.min(weeksInactive * DECAY_PER_WEEK, DECAY_CAP);
    
    if (decayAmount > 0 && rating.rating > MIN_RATING) {
      const newRating = Math.max(MIN_RATING, rating.rating - decayAmount);
      const actualDecay = rating.rating - newRating;
      
      await storage.updateUserRating(userId, {
        rating: newRating,
        ratingDecay: rating.ratingDecay + actualDecay,
        tier: this.getTierForRating(newRating),
      });
      
      return actualDecay;
    }

    return 0;
  }

  getTierInfo(tier: string): { name: string; color: string; minRating: number } {
    const tierColors: Record<string, string> = {
      grandmaster: "#ff4444",
      master: "#ff8800",
      diamond: "#00bfff",
      platinum: "#00ff88",
      gold: "#ffd700",
      silver: "#c0c0c0",
      bronze: "#cd7f32",
    };

    return {
      name: tier.charAt(0).toUpperCase() + tier.slice(1),
      color: tierColors[tier] || "#888888",
      minRating: TIER_THRESHOLDS[tier as keyof typeof TIER_THRESHOLDS] || 0,
    };
  }
}

export const eloRatingService = new EloRatingService();
