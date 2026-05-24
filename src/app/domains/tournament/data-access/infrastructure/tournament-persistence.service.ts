import { Injectable, inject } from "@angular/core";
import {
  ClassicTournamentConfig,
  Match,
  TournamentConfig,
  TournamentRecord,
} from "@shared/models/player.model";
import { NotificationService } from "@shared/services/notification.service";

interface TournamentSessionSnapshot {
  config: TournamentConfig | null;
  matches: Match[];
  history: TournamentRecord[];
}

@Injectable({ providedIn: "root" })
export class TournamentPersistenceService {
  private readonly storageKey = "paddletools_config";
  private readonly matchesKey = "paddletools_matches";
  private readonly historyKey = "paddletools_history";
  private readonly notifications = inject(NotificationService);

  loadSession(): TournamentSessionSnapshot {
    try {
      const configStr = localStorage.getItem(this.storageKey);
      const matchesStr = localStorage.getItem(this.matchesKey);
      const config = configStr ? this.migrateConfig(JSON.parse(configStr) as TournamentConfig) : null;
      const matches = matchesStr
        ? (JSON.parse(matchesStr) as Match[]).map((match) => this.migrateMatch(match))
        : [];
      const history = this.loadHistory().map((record) => ({
        ...record,
        config: this.migrateConfig(record.config),
        matches: record.matches.map((match) => this.migrateMatch(match)),
      }));

      return { config, matches, history };
    } catch {
      this.notifications.showSystemError(
        "Error interno: no se pudieron cargar los datos locales.",
      );
      return { config: null, matches: [], history: [] };
    }
  }

  saveSession(config: TournamentConfig, matches: Match[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(config));
      localStorage.setItem(this.matchesKey, JSON.stringify(matches));
    } catch {
      this.notifications.showSystemError(
        "Error interno: no se pudo guardar el torneo.",
      );
    }
  }

  clearSession(): void {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.matchesKey);
  }

  loadHistory(): TournamentRecord[] {
    try {
      const raw = localStorage.getItem(this.historyKey);
      const records = raw ? (JSON.parse(raw) as TournamentRecord[]) : [];
      return records.map((record) => ({
        ...record,
        config: this.migrateConfig(record.config),
        matches: record.matches.map((match) => this.migrateMatch(match)),
      }));
    } catch {
      return [];
    }
  }

  saveHistory(history: TournamentRecord[]): void {
    try {
      localStorage.setItem(this.historyKey, JSON.stringify(history));
    } catch {
      this.notifications.showSystemError(
        "Error interno: no se pudo guardar el historial.",
      );
    }
  }

  migrateMatch(match: Match): Match {
    return {
      ...match,
      scoringMode: match.scoringMode ?? "points",
      sets: match.sets ?? [],
      completed: match.completed ?? false,
      winner: match.winner ?? undefined,
    };
  }

  private migrateConfig(config: TournamentConfig): TournamentConfig {
    if (config.type === "classic") {
      const classic = config as ClassicTournamentConfig;
      return {
        ...classic,
        pairs: classic.pairs ?? this.buildPairsFromPlayers(classic.players),
      };
    }

    return {
      ...config,
      type: "americano",
      scoringMode: config.scoringMode ?? "points",
    };
  }

  private buildPairsFromPlayers(players: ClassicTournamentConfig["players"]): ClassicTournamentConfig["pairs"] {
    const pairsMap = new Map<number, ClassicTournamentConfig["pairs"][number]>();

    players.forEach((player) => {
      if (player.pairId === undefined) {
        return;
      }

      const existing = pairsMap.get(player.pairId);
      if (!existing) {
        pairsMap.set(player.pairId, {
          id: player.pairId,
          player1: { ...player },
          player2: { ...player },
        });
        return;
      }

      if (existing.player1.id === player.id) {
        existing.player1 = { ...player };
      } else {
        existing.player2 = { ...player };
      }
    });

    return Array.from(pairsMap.values()).filter(
      (pair) => pair.player1.id !== pair.player2.id,
    );
  }
}
