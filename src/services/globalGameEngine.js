// ═══════════════════════════════════════════════════════════════════════════
// CRVPER.BET — Deterministic Global Shared Game Engine
// ─────────────────────────────────────────────────────────────────────────
// Generates identical, synchronized outcomes for Aviator and WinGo across
// ALL devices on the internet using synchronized UTC epoch time.
//
// 1. Every device anywhere on earth sees the EXACT same roundId, flight time,
//    multiplier, crash point, colors, numbers, and continuous past history.
// 2. Continues running in the background even after users exit the game,
//    ensuring uninterrupted history and live cards everywhere.
// ═══════════════════════════════════════════════════════════════════════════

// Seeded pseudorandom generator (Mulberry32) — 100% deterministic
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GLOBAL SYNCHRONIZED AVIATOR ENGINE
// ─────────────────────────────────────────────────────────────────────────────
// Flight duration formula: elapsed seconds to reach multiplier M
// M = e^(0.08 * t * 2.5) => M = e^(0.2 * t) => t = ln(M) / 0.2 = 5 * ln(M)
function calcFlightDuration(crashMult) {
  const t = Math.max(0.5, 5 * Math.log(Math.max(1.01, crashMult)));
  return Number(t.toFixed(2));
}

export function getAviatorCrashForRound(roundNumber) {
  const rng = mulberry32(roundNumber * 7919 + 4243);
  const r = rng();

  let mult;
  if (r < 0.10) {
    mult = 1.00;
  } else if (r < 0.38) {
    mult = 1.01 + rng() * 0.48; // 1.01x - 1.49x
  } else if (r < 0.72) {
    mult = 1.50 + rng() * 2.20; // 1.50x - 3.70x
  } else if (r < 0.88) {
    mult = 3.70 + rng() * 4.30; // 3.70x - 8.00x
  } else if (r < 0.96) {
    mult = 8.00 + rng() * 12.0; // 8.00x - 20.0x
  } else {
    mult = 20.0 + rng() * 65.0; // 20.0x - 85.0x
  }

  return Number(Math.max(1.00, mult).toFixed(2));
}

// Each Aviator round cycle = 5s waiting + flightDuration + 3.2s crashed pause
// We reconstruct the timeline from an anchor epoch (Jan 1, 2026 UTC).
const AVIATOR_ANCHOR_TIME = 1767225600000; // 2026-01-01 00:00:00 UTC

// Fast forward from estimated anchor to find the current round and exact phase
export function getLiveAviatorState(nowMs = Date.now()) {
  // Approximate average round ~18 seconds
  const approxRounds = Math.floor((nowMs - AVIATOR_ANCHOR_TIME) / 18000);
  
  // Search backward/forward around approxRounds for the exact match
  let r = Math.max(1, approxRounds - 50);
  let curStart = AVIATOR_ANCHOR_TIME;

  // Jump closer in blocks if far
  while (curStart < nowMs - 3600000) {
    const jump = 200;
    r += jump;
    curStart += jump * 18000;
  }

  // Linear scan to pinpoint exact current round
  while (true) {
    const crash = getAviatorCrashForRound(r);
    const flightDur = calcFlightDuration(crash);
    const waitingDur = 5.0;
    const crashedDur = 3.2;
    const totalCycle = (waitingDur + flightDur + crashedDur) * 1000;

    if (curStart + totalCycle > nowMs) {
      // Found the active round!
      const elapsedInRound = (nowMs - curStart) / 1000;
      const roundId = `AV-${r}`;

      if (elapsedInRound < waitingDur) {
        // WAITING PHASE (5s countdown)
        const countdown = Math.max(1, Math.ceil(waitingDur - elapsedInRound));
        return {
          roundId,
          roundNumber: r,
          gameState: 'WAITING',
          countdown,
          multiplier: 1.00,
          crashPoint: crash,
          flightDuration: flightDur,
          elapsedFlight: 0
        };
      } else if (elapsedInRound < waitingDur + flightDur) {
        // FLYING PHASE
        const flightTime = elapsedInRound - waitingDur;
        const currentMult = Number(Math.min(crash, Math.pow(Math.E, 0.20 * flightTime)).toFixed(2));
        return {
          roundId,
          roundNumber: r,
          gameState: 'FLYING',
          countdown: 0,
          multiplier: currentMult,
          crashPoint: crash,
          flightDuration: flightDur,
          elapsedFlight: flightTime
        };
      } else {
        // CRASHED PHASE (3.2s)
        return {
          roundId,
          roundNumber: r,
          gameState: 'CRASHED',
          countdown: 0,
          multiplier: crash,
          crashPoint: crash,
          flightDuration: flightDur,
          elapsedFlight: flightDur
        };
      }
    }

    curStart += totalCycle;
    r++;
  }
}

// Generate continuous past Aviator history (e.g., last 15 rounds)
export function getAviatorHistory(count = 12, nowMs = Date.now()) {
  const current = getLiveAviatorState(nowMs);
  const history = [];
  const startR = current.gameState === 'CRASHED' ? current.roundNumber : current.roundNumber - 1;

  for (let i = 0; i < count; i++) {
    const r = startR - i;
    if (r > 0) {
      history.push(getAviatorCrashForRound(r));
    }
  }
  return history;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. GLOBAL SYNCHRONIZED WIN GO ENGINE (60-SECOND CYCLE)
// ─────────────────────────────────────────────────────────────────────────────
// Epoch: 60-second fixed clock boundary. Exactly syncs with system seconds (00-59).
// Round Number = Math.floor(nowMs / 60000)
export function getWinGoOutcomeForRound(roundNumber) {
  const rng = mulberry32(roundNumber * 8191 + 1337);
  const num = Math.floor(rng() * 10);
  const color = num % 2 === 0 ? 'RED' : 'GREEN';
  const isViolet = num === 0 || num === 5;
  const size = num >= 5 ? 'BIG' : 'SMALL';

  return {
    round: `#${roundNumber}`,
    roundId: `WG-${roundNumber}`,
    num,
    color,
    size,
    isViolet
  };
}

export function getLiveWinGoState(nowMs = Date.now()) {
  const roundNumber = Math.floor(nowMs / 60000);
  const msInRound = nowMs % 60000;
  const secondsLeft = Math.max(1, 60 - Math.floor(msInRound / 1000));
  const isLocked = secondsLeft <= 10;
  const currentOutcome = getWinGoOutcomeForRound(roundNumber);

  return {
    roundNumber,
    roundId: `CRV-${roundNumber}`,
    secondsLeft,
    isLocked,
    currentOutcome
  };
}

// Generate continuous WinGo history (last N rounds)
export function getWinGoHistory(count = 12, nowMs = Date.now()) {
  const currentRound = Math.floor(nowMs / 60000);
  const list = [];
  for (let i = 1; i <= count; i++) {
    list.push(getWinGoOutcomeForRound(currentRound - i));
  }
  return list;
}
