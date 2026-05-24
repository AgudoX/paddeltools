import { SetScore } from "@shared/models/player.model";

export function getSetWinner(set: SetScore): "pair1" | "pair2" | null {
  const { pair1Games: p1, pair2Games: p2 } = set;
  if (p1 < 0 || p2 < 0) return null;

  const max = Math.max(p1, p2);
  const diff = Math.abs(p1 - p2);

  if (max < 6) return null;
  if (diff >= 2) return p1 > p2 ? "pair1" : "pair2";
  if (max >= 7 && diff === 1) return p1 > p2 ? "pair1" : "pair2";

  return null;
}

export function getMatchWinner(
  sets: SetScore[],
): "pair1" | "pair2" | null {
  let p1 = 0;
  let p2 = 0;

  for (const set of sets) {
    const winner = getSetWinner(set);
    if (winner === "pair1") p1++;
    if (winner === "pair2") p2++;
  }

  if (p1 >= 2) return "pair1";
  if (p2 >= 2) return "pair2";
  return null;
}

export function isSetComplete(set: SetScore): boolean {
  return getSetWinner(set) !== null;
}

export function isMatchComplete(sets: SetScore[]): boolean {
  return getMatchWinner(sets) !== null;
}

export function isValidPointsInput(p1: number, p2: number): boolean {
  if (p1 < 0 || p2 < 0) return false;
  return Math.abs(p1 - p2) >= 2;
}
