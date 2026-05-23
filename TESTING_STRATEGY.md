# Padel Tourney Hub - Test Matrix

## Goal
Build confidence where regressions are most expensive: tournament generation fairness, scoring correctness, ranking accuracy, and route-level user flows.

## Test Pyramid
- Unit tests (majority): pure domain logic and small components.
- Integration tests (some): facade + service interactions with mocked dependencies.
- Flow tests (few): key container/page behaviors across routing and persistence boundaries.

## Priority Matrix

### P0 - Critical Domain Rules
- `TournamentService` scoring utilities:
  - `getSetWinner` for incomplete set, standard wins, 7-6 wins, invalid negatives.
  - `getMatchWinner` and `isMatchComplete` for 2-set and 3-set completion.
  - `isValidPointsInput` for diff `< 2`, ties, negative values.
- Tournament generation invariants:
  - Every generated match has 4 unique players.
  - Match count equals `(players / 4) * rounds`.
  - Fixed-pair mode keeps pair members together.
- Ranking/statistics:
  - Win/played/sets/points/difference calculations.
  - Sort tiebreak order: wins, then sets, then difference.

### P1 - State and Persistence
- `TournamentFacade`:
  - signal mirrors service streams correctly.
  - delegates command methods without mutating outside expected boundaries.
- Persistence/migration:
  - loads older matches without `scoringMode` and migrates to defaults.
  - `loadTournament` updates current id + config + matches.
  - `clearData` clears active tournament state.

### P2 - UI and Routing Flows
- `PlayerFormPage`:
  - validation errors for duplicate names, invalid player count, rounds < 1.
  - mode switching between `free` and `fixed-pairs` preserves expected player shape.
- `SummaryPage`:
  - set editor validation blocks invalid save.
  - statistics toggle reveals ranking and scroll target.
- Route-level smoke tests:
  - form -> generate -> summary navigation.
  - history -> detail restore tournament.

## Coverage Targets
- Domain service and pure logic: `>= 90%` lines/functions.
- Facade: `>= 85%`.
- Containers/components: `>= 70%` with focus on critical branches, not snapshot volume.

## Execution Plan
1. Lock P0 utility and invariant tests first (fastest risk reduction).
2. Expand P1 persistence/migration assertions.
3. Add 2-3 P2 route/flow tests for end-user confidence.
4. Run coverage and fail CI under agreed thresholds.
