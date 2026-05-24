import { Match } from "@shared/models/player.model";

export function generateSummary(matches: Match[]): string {
  const lines: string[] = [];
  const matchesByRound = new Map<number, Match[]>();

  matches.forEach((match) => {
    if (!matchesByRound.has(match.round)) {
      matchesByRound.set(match.round, []);
    }
    matchesByRound.get(match.round)?.push(match);
  });

  const rounds = Array.from(matchesByRound.keys()).sort((a, b) => a - b);

  rounds.forEach((roundNumber) => {
    const roundMatches = matchesByRound.get(roundNumber) ?? [];
    lines.push(`━━━ RONDA ${roundNumber} ━━━`);
    lines.push(`(${roundMatches.length} partido(s) simultáneo(s))\n`);

    roundMatches.forEach((match) => {
      const [p1, p2] = match.pair1;
      const [p3, p4] = match.pair2;
      let line = `Partido ${match.number}: [${p1.name}, ${p2.name}] vs [${p3.name}, ${p4.name}]`;

      if (match.scoringMode === "sets" && match.sets.length > 0) {
        const setStr = match.sets
          .filter((set) => set.pair1Games >= 0 && set.pair2Games >= 0)
          .map((set) => `${set.pair1Games}-${set.pair2Games}`)
          .join(", ");
        if (setStr) line += ` — ${setStr}`;
      } else if (
        match.scorePair1 !== undefined &&
        match.scorePair2 !== undefined
      ) {
        line += ` — ${match.scorePair1}:${match.scorePair2}`;
      }

      lines.push(line);
    });

    lines.push("");
  });

  return lines.join("\n");
}
