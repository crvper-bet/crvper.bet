// ═══════════════════════════════════════════════════════════════════════════
// CRVPER Platform — Rules, Wallets, Wagering & Risk Controls Test Suite
// ═══════════════════════════════════════════════════════════════════════════

import assert from 'node:assert';
import { test, describe, beforeEach } from 'node:test';

// Mock localStorage for Node test runner
const localStorageStore = {};
globalThis.localStorage = {
  getItem: (key) => localStorageStore[key] || null,
  setItem: (key, val) => { localStorageStore[key] = String(val); },
  removeItem: (key) => { delete localStorageStore[key]; },
  clear: () => {
    for (const k of Object.keys(localStorageStore)) {
      delete localStorageStore[k];
    }
  }
};
globalThis.window = {
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {}
};
globalThis.CustomEvent = class {
  constructor(name, opts) {
    this.name = name;
    this.detail = opts?.detail;
  }
};
globalThis.Event = class {
  constructor(name) {
    this.name = name;
  }
};

const { storage } = await import('../src/services/storage.js');
const { 
  getAviatorCrashForRound, 
  getWinGoOutcomeForRound, 
  cryptographicSeedMixer,
  GLOBAL_SALT_AVIATOR,
  GLOBAL_SALT_WINGO
} = await import('../src/services/globalGameEngine.js');

describe('CRVPER Platform Specifications Test Suite', () => {

  const randomPhone = () => '9' + Math.floor(100000000 + Math.random() * 900000000);

  beforeEach(() => {
    localStorage.clear();
  });

  test('1. Registration Bonus: Credited once with separated 4-balance vault', async () => {
    const phone = randomPhone();
    const user = await storage.registerUser({
      phone,
      password: 'password123'
    });

    assert.strictEqual(user.walletBalance, 150.00, 'Total wallet balance should be ₹150');
    assert.strictEqual(user.depositBalance, 0.00, 'Deposit balance should start at 0');
    assert.strictEqual(user.bonusBalance, 150.00, 'Bonus balance should be ₹150');
    assert.strictEqual(user.winningsBalance, 0.00, 'Winnings balance should start at 0');
    assert.strictEqual(user.bonusClaimed, true, 'Bonus claimed flag must be true');
    assert.strictEqual(user.hasDeposited, false, 'hasDeposited must start false');

    // Wagering requirement on ₹150 bonus (50% rule) = ₹75
    assert.strictEqual(user.wageringRequired, 75.00, 'Wagering requirement must be 50% of ₹150 (₹75)');
    assert.strictEqual(user.wageringWagered, 0.00, 'Wagering wagered starts at 0');
    assert.strictEqual(user.wageringRemaining, 75.00, 'Wagering remaining starts at ₹75');

    // Verify ledger entry
    const txs = storage.getTransactions(user.id);
    const bonusTx = txs.find(t => t.type === 'BONUS');
    assert.ok(bonusTx, 'Bonus transaction must be logged in ledger');
    assert.strictEqual(bonusTx.amount, 150);

    // Prevent duplicate registration with same phone
    await assert.rejects(
      async () => {
        await storage.registerUser({ phone, password: 'newpassword' });
      },
      /already registered/
    );
  });

  test('2. Wagering Requirements & Balance Bucket Priority (Bonus First, Then Deposit, Then Winnings)', async () => {
    const phone = randomPhone();
    const user = await storage.registerUser({
      phone,
      password: 'password123'
    });

    // User wagers ₹50 on eligible game
    await storage.updateWalletBalance(user.id, -50, 'Aviator Bet Panel 1');
    const uAfterBet = storage.getCurrentUser();

    // Bonus balance should decrease from 150 to 100
    assert.strictEqual(uAfterBet.bonusBalance, 100.00);
    assert.strictEqual(uAfterBet.walletBalance, 100.00);
    // Wagering wagered should advance by 50, remaining = 75 - 50 = 25
    assert.strictEqual(uAfterBet.wageringWagered, 50.00);
    assert.strictEqual(uAfterBet.wageringRemaining, 25.00);

    // User wins ₹100 profit
    await storage.updateWalletBalance(user.id, 100, 'Aviator Cashout Panel 1 (2.0x)');
    const uAfterWin = storage.getCurrentUser();
    assert.strictEqual(uAfterWin.winningsBalance, 100.00, 'Profit goes to winningsBalance');
    assert.strictEqual(uAfterWin.bonusBalance, 100.00);
    assert.strictEqual(uAfterWin.walletBalance, 200.00);

    // User wagers ₹120: should consume all ₹100 bonus + ₹20 from winnings
    await storage.updateWalletBalance(user.id, -120, 'Aviator Bet Panel 1');
    const uAfterBet2 = storage.getCurrentUser();
    assert.strictEqual(uAfterBet2.bonusBalance, 0.00, 'Bonus balance exhausted');
    assert.strictEqual(uAfterBet2.winningsBalance, 80.00, 'Winnings balance reduced by ₹20');
    assert.strictEqual(uAfterBet2.walletBalance, 80.00);
    // Wagering requirement should now be completely fulfilled (wagered 50 + 120 = 170 >= 75)
    assert.strictEqual(uAfterBet2.wageringRemaining, 0.00);
  });

  test('3. Withdrawal Eligibility: Exact Validation Messages', async () => {
    const user = await storage.registerUser({
      phone: randomPhone(),
      password: 'password123'
    });

    // Attempt withdrawal without depositing: must fail with exact required message
    await assert.rejects(
      async () => {
        await storage.createWithdrawalRequest({
          userId: user.id,
          userPhone: user.phone,
          amount: 100,
          upiId: 'test@upi'
        });
      },
      (err) => {
        assert.strictEqual(
          err.message,
          'A minimum deposit of ₹100 is required to become eligible for withdrawal under this promotion.'
        );
        return true;
      }
    );

    // Now simulate user making a deposit request of ₹100 and admin approving it
    const depReq = await storage.createDepositRequest({
      userId: user.id,
      userPhone: user.phone,
      amount: 100,
      utr: '123456789012'
    });
    await storage.approveDeposit(depReq.id);

    const uAfterDep = storage.getCurrentUser();
    assert.strictEqual(uAfterDep.hasDeposited, true, 'User should be marked as deposited');
    assert.strictEqual(uAfterDep.depositBalance, 100.00);
    // Wagering requirement: 50% of ₹150 (₹75) + 50% of ₹100 (₹50) = ₹125
    assert.strictEqual(uAfterDep.wageringRequired, 125.00);
    assert.strictEqual(uAfterDep.wageringRemaining, 125.00);

    // Depositing money is NOT automatic proof of eligibility (wagering still remaining!)
    await assert.rejects(
      async () => {
        await storage.createWithdrawalRequest({
          userId: user.id,
          userPhone: user.phone,
          amount: 100,
          upiId: 'test@upi'
        });
      },
      (err) => {
        assert.strictEqual(
          err.message,
          'You need to wager ₹125.00 more to meet your promotional requirement.'
        );
        return true;
      }
    );

    // User completes required wagering: wagers ₹125 across games
    await storage.updateWalletBalance(user.id, -125, 'Aviator Game Bets');
    const uAfterWagering = storage.getCurrentUser();
    assert.strictEqual(uAfterWagering.wageringRemaining, 0.00);

    // Win ₹200 back
    await storage.updateWalletBalance(user.id, 200, 'Aviator Game Win');
    const uWithdrawable = storage.getCurrentUser();

    const eligibility = storage.getWithdrawalEligibility(user.id);
    assert.strictEqual(eligibility.isEligible, true);
    assert.ok(eligibility.withdrawableBalance >= 100);

    // Withdrawal now succeeds!
    const wthReq = await storage.createWithdrawalRequest({
      userId: user.id,
      userPhone: user.phone,
      amount: 100,
      upiId: 'winner@upi'
    });
    assert.strictEqual(wthReq.status, 'PENDING');
    assert.strictEqual(wthReq.amount, 100);
  });

  test('4. Winning-Limit Policy: Disabled by default for unrestricted player winnings', async () => {
    const user = await storage.registerUser({
      phone: randomPhone(),
      password: 'password123'
    });

    // Deposit ₹100
    const depReq = await storage.createDepositRequest({
      userId: user.id,
      userPhone: user.phone,
      amount: 100,
      utr: '998877665544'
    });
    await storage.approveDeposit(depReq.id);

    // Limit check before win
    const limitBefore = storage.checkGameWinningLimit(user.id, 'Aviator');
    assert.strictEqual(limitBefore.isLimitReached, false);

    // Add ₹10,000 profit to winningsBalance
    await storage.updateWalletBalance(user.id, 10000, 'Aviator Win');

    // Winning limit is NEVER reached - unrestricted player experience
    const limitAviator = storage.checkGameWinningLimit(user.id, 'Aviator');
    assert.strictEqual(limitAviator.isLimitReached, false);

    const limitWinGo = storage.checkGameWinningLimit(user.id, 'WinGo');
    assert.strictEqual(limitWinGo.isLimitReached, false);

    const limitMines = storage.checkGameWinningLimit(user.id, 'Mines');
    assert.strictEqual(limitMines.isLimitReached, false);

    const limitDice = storage.checkGameWinningLimit(user.id, 'Quantum Dice');
    assert.strictEqual(limitDice.isLimitReached, false);
  });

  test('5. Provable Fairness & Unpredictability: Cryptographic Avalanche PRNG', () => {
    // 1. Check seed mixer non-linearity and high entropy
    const hash1 = cryptographicSeedMixer(1, GLOBAL_SALT_AVIATOR);
    const hash2 = cryptographicSeedMixer(2, GLOBAL_SALT_AVIATOR);
    const hash3 = cryptographicSeedMixer(3, GLOBAL_SALT_AVIATOR);

    // Avalanche effect: small change in round number results in drastic hash change
    assert.notStrictEqual(hash1, hash2);
    assert.notStrictEqual(hash2, hash3);
    assert.ok(Math.abs(hash1 - hash2) > 1000000, 'Avalanche bit flip should produce huge divergence');

    // 2. Determinism check: Same round produces identical outcome on any device
    const aviatorR100_A = getAviatorCrashForRound(100);
    const aviatorR100_B = getAviatorCrashForRound(100);
    assert.strictEqual(aviatorR100_A, aviatorR100_B, 'Device A and Device B must get identical Aviator crash points');

    const wingoR500_A = getWinGoOutcomeForRound(500);
    const wingoR500_B = getWinGoOutcomeForRound(500);
    assert.deepStrictEqual(wingoR500_A, wingoR500_B, 'Device A and Device B must get identical WinGo outcomes');

    // Verify valid values
    assert.ok(aviatorR100_A >= 1.00);
    assert.ok(wingoR500_A.num >= 0 && wingoR500_A.num <= 9);
    assert.ok(['RED', 'GREEN'].includes(wingoR500_A.color));
  });

  test('6. Admin Configuration & Audit Logging', async () => {
    // Log setting change
    const log1 = await storage.logAdminSettingChange(
      'crvvper (Admin)',
      'Registration Bonus',
      '₹150',
      '₹200'
    );

    assert.ok(log1.id);
    assert.strictEqual(log1.admin, 'crvvper (Admin)');
    assert.strictEqual(log1.setting, 'Registration Bonus');
    assert.strictEqual(log1.previousValue, '₹150');
    assert.strictEqual(log1.newValue, '₹200');

    const settings = storage.getAdminSettings();
    assert.ok(settings.auditLogs.length > 0);
    assert.strictEqual(settings.auditLogs[0].setting, 'Registration Bonus');
  });

});
