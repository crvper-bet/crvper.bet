// ═══════════════════════════════════════════════════════════════════════════
// CRVPER.BET — Deterministic Worldwide Synchronized Game Engine v3
// ─────────────────────────────────────────────────────────────────────────
// Generates EXACT, UNBROKEN, IDENTICAL outcomes for Aviator and WinGo across
// ALL devices on the entire internet using synchronized UTC epoch time.
//
// 1. Devices A, B, C, etc. will see the EXACT same round, flight timeline,
//    multiplier, crash point, colors, numbers, and historical outcomes.
// 2. Timeline runs continuously in the background even after users exit the game.
// 3. Guaranteed monotonic and smooth — no time-skips or sudden jump-crashes.
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
const WAITING_MS = 5000;       // 5.0 seconds boarding countdown
const CRASHED_PAUSE_MS = 3000; // 3.0 seconds crashed pause
const CHECKPOINT_ROUNDS = 500; // Checkpoint block size

// Fixed anchor: 2026-10-16 00:00:00 UTC (Today's base)
const ANCHOR_EPOCH = 1792108800000;

export function getAviatorCrashForRound(roundNumber) {
  const rng = mulberry32(roundNumber * 9973 + 12345);
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

export function calcFlightDuration(crashMult) {
  if (crashMult <= 1.00) return 0.60;
  // Natural aerodynamic acceleration:
  // 1.50x takes ~2.2s, 3.00x takes ~6.1s, 10.0x takes ~12.8s, 50.0x takes ~21.7s
  const s = Math.log(crashMult) / 0.18;
  return Number(Math.max(0.80, s).toFixed(2));
}

function getRoundDurMs(roundNumber) {
  const crash = getAviatorCrashForRound(roundNumber);
  const flightMs = Math.round(calcFlightDuration(crash) * 1000);
  return WAITING_MS + flightMs + CRASHED_PAUSE_MS;
}

// Checkpoint cache for sub-millisecond timeline lookup across all devices
const CHECKPOINTS = [0];

function ensureCheckpoints(targetMs) {
  let curMs = ANCHOR_EPOCH + CHECKPOINTS[CHECKPOINTS.length - 1];
  let curIndex = CHECKPOINTS.length - 1;

  while (curMs < targetMs + 7200000) { // Keep 2 hours ahead
    const startR = curIndex * CHECKPOINT_ROUNDS;
    let blockMs = 0;
    for (let i = 0; i < CHECKPOINT_ROUNDS; i++) {
      blockMs += getRoundDurMs(startR + i);
    }
    curMs += blockMs;
    CHECKPOINTS.push(CHECKPOINTS[CHECKPOINTS.length - 1] + blockMs);
    curIndex++;
  }
}

// Exactly resolves the live flight state for any timestamp
export function getLiveAviatorState(nowMs = Date.now()) {
  ensureCheckpoints(nowMs);
  const offset = nowMs - ANCHOR_EPOCH;

  // Binary search for checkpoint block
  let low = 0;
  let high = CHECKPOINTS.length - 1;
  let blockIdx = 0;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (CHECKPOINTS[mid] <= offset) {
      blockIdx = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  // Linear scan inside the 500-round block (< 0.2ms total execution)
  let r = blockIdx * CHECKPOINT_ROUNDS;
  let curStart = ANCHOR_EPOCH + CHECKPOINTS[blockIdx];

  while (true) {
    const crash = getAviatorCrashForRound(r);
    const flightDurSec = calcFlightDuration(crash);
    const flightDurMs = Math.round(flightDurSec * 1000);
    const totalRoundMs = WAITING_MS + flightDurMs + CRASHED_PAUSE_MS;

    if (curStart + totalRoundMs > nowMs) {
      // Exactly this round!
      const elapsedInRound = nowMs - curStart;
      const roundId = `AV-${r + 1}`;
      const roundNumber = r + 1;

      if (elapsedInRound < WAITING_MS) {
        // WAITING PHASE (5s countdown)
        const countdown = Math.max(1, Math.ceil((WAITING_MS - elapsedInRound) / 1000));
        return {
          roundId,
          roundNumber,
          gameState: 'WAITING',
          countdown,
          multiplier: 1.00,
          crashPoint: crash,
          flightDuration: flightDurSec,
          elapsedFlight: 0
        };
      } else if (elapsedInRound < WAITING_MS + flightDurMs) {
        // FLYING PHASE
        const flightTime = (elapsedInRound - WAITING_MS) / 1000;
        const currentMult = Number(Math.min(crash, Math.pow(Math.E, 0.18 * flightTime)).toFixed(2));
        return {
          roundId,
          roundNumber,
          gameState: 'FLYING',
          countdown: 0,
          multiplier: currentMult,
          crashPoint: crash,
          flightDuration: flightDurSec,
          elapsedFlight: flightTime
        };
      } else {
        // CRASHED PHASE (3s pause)
        return {
          roundId,
          roundNumber,
          gameState: 'CRASHED',
          countdown: 0,
          multiplier: crash,
          crashPoint: crash,
          flightDuration: flightDurSec,
          elapsedFlight: flightDurSec
        };
      }
    }

    curStart += totalRoundMs;
    r++;
  }
}

// Generate continuous past Aviator history across all devices
export function getAviatorHistory(count = 10, nowMs = Date.now()) {
  const current = getLiveAviatorState(nowMs);
  const history = [];
  const startR = current.gameState === 'CRASHED' ? current.roundNumber - 1 : current.roundNumber - 2;

  for (let i = 0; i < count; i++) {
    const r = startR - i;
    if (r >= 0) {
      history.push(getAviatorCrashForRound(r));
    }
  }
  return history;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. GLOBAL SYNCHRONIZED WIN GO ENGINE (60-SECOND FIXED UTC CLOCK)
// ─────────────────────────────────────────────────────────────────────────────
export function getWinGoOutcomeForRound(roundNumber) {
  const rng = mulberry32(roundNumber * 8191 + 1337);
  const num = Math.floor(rng() * 10);
  const color = num % 2 === 0 ? 'RED' : 'GREEN';
  const isViolet = num === 0 || num === 5;
  const size = num >= 5 ? 'BIG' : 'SMALL';

  return {
    round: `#${roundNumber}`,
    roundId: `CRV-${roundNumber}`,
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

export function getWinGoHistory(count = 12, nowMs = Date.now()) {
  const currentRound = Math.floor(nowMs / 60000);
  const list = [];
  for (let i = 1; i <= count; i++) {
    list.push(getWinGoOutcomeForRound(currentRound - i));
  }
  return list;
}
