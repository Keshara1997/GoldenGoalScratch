import pool from '../config/database';
import { randomInt, distinctNumbers, shuffle, weightedRandom } from '../utils/random';
import { pad2, joinArray } from '../utils/formatters';
import { getMultipliersForBet, MultiplierInfo, HitPattern } from './MultiplierConfig';

// export const BET_TIERS = [1,2,4,8,10,20,40,80,100,200,400,800,1000];
export const BET_TIERS = [10];
export const MIN_TICKET_COUNT = 100;
export const MAX_TICKET_COUNT = 1000;
const WINNING_NUMBERS_COUNT = 5;
const NUMBERS_COUNT = 20;
const NUMBER_POOL_SIZE = 100;
const TICKET_INSERT_COLUMNS = 17;
const TICKET_INSERT_ROWS_PER_QUERY = 500;

const AMOUNT_POOLS = {
    LOW: { denominations: [1.5, 2, 2.5, 3, 4], count: 4 },
    MEDIUM: { denominations: [5, 6, 8, 10, 12, 15], count: 4 },
    HIGH: { denominations: [20, 25, 30, 40, 50], weights: [0.4, 0.3, 0.2, 0.08, 0.02], count: 6 },
    JACKPOT: { denominations: [200, 800], weights: [0.5, 0.5], count: 6 },
};

// generate printed amounts (20 cells on the ticket face)
// Amount Pools (Factors)
function generatePrintedAmounts(): number[] {
    const low = Array.from({ length: AMOUNT_POOLS.LOW.count }, () => {
        const idx = randomInt(0, AMOUNT_POOLS.LOW.denominations.length - 1);
        return AMOUNT_POOLS.LOW.denominations[idx];
    });
    const medium = Array.from({ length: AMOUNT_POOLS.MEDIUM.count }, () => {
        const idx = randomInt(0, AMOUNT_POOLS.MEDIUM.denominations.length - 1);
        return AMOUNT_POOLS.MEDIUM.denominations[idx];
    });
    const high = Array.from({ length: AMOUNT_POOLS.HIGH.count }, () => {
        return weightedRandom(AMOUNT_POOLS.HIGH.denominations, AMOUNT_POOLS.HIGH.weights);
    });
    const jackpot = Array.from({ length: AMOUNT_POOLS.JACKPOT.count }, () => {
        return weightedRandom(AMOUNT_POOLS.JACKPOT.denominations, AMOUNT_POOLS.JACKPOT.weights);
    });
    const all = [...low, ...medium, ...high, ...jackpot];
    return shuffle(all);
}

// Converts a multiplier pattern into actual currency values for this bet.
function generateHitAmounts(pattern: HitPattern, bet: number): number[] {
    console.log('generateHitAmounts', pattern, bet);
    const amounts = pattern.amounts.map(a => Math.round(a * bet));
    console.log('amounts', amounts);
    return amounts;
}

// generate one ticket
async function generateTicket(bet: number, multiplierInfo: MultiplierInfo, pattern: HitPattern | null, batchId: number, seq: number): Promise<any> {
    const isWinning = multiplierInfo.hitCount > 0;
    // Pick 5 unique winning numbers from 00..99.
    const winningNumbers = distinctNumbers(WINNING_NUMBERS_COUNT, NUMBER_POOL_SIZE).map(pad2);
    console.log('03. winningNumbers', winningNumbers);
    // Build the 20 printed amount cells
    const printedAmounts = generatePrintedAmounts();
    console.log('04. printedAmounts', printedAmounts);
    // For winning tickets, precompute where hits land and what each hit pays.
    let hitPositions: number[] = [];
    let hitAmounts: number[] = [];
    let hitNumbers: string[] = [];
    console.log('04.1. hitPositions', hitPositions);
    console.log('04.2. hitAmounts', hitAmounts);
    console.log('04.3. hitNumbers', hitNumbers);
    if (isWinning && pattern) {
        console.log('05. isWinning', isWinning);
        console.log('06. pattern', pattern);
        const positions = distinctNumbers(multiplierInfo.hitCount, NUMBERS_COUNT);
        hitPositions = positions.sort((a, b) => a - b);
        console.log('07. positions', positions);
        hitAmounts = generateHitAmounts(pattern, bet);
        console.log('08. hitAmounts', hitAmounts);
        // Hit numbers must be a subset of winning numbers so the ticket matches.
        const selectedWinningNumbers = shuffle(winningNumbers).slice(0, multiplierInfo.hitCount);
        hitNumbers = selectedWinningNumbers;
        console.log('09. selectedWinningNumbers', selectedWinningNumbers);
    }
    console.log('10. hitPositions', hitPositions);
    // "Your numbers" is the 20-cell 
    let yourNumbers: string[] = new Array(NUMBERS_COUNT);
    let usedNumbers = new Set<string>();
    let nearMissPositions: number[] = [];
    let nearMissNumbers: string[] = [];
    // Place hit numbers
    for (let i = 0; i < hitPositions.length; i++) {
        const pos = hitPositions[i];
        yourNumbers[pos] = hitNumbers[i];
        usedNumbers.add(hitNumbers[i]);
    }
    // Losing tickets get near-miss values to improve player experience:
    // numbers adjacent to winning numbers, but never exact matches.
    if (!isWinning) {
        // Choose 4 winning numbers for near‑miss
        const selectedWNums = shuffle(winningNumbers).slice(0, 4);
        const candidates = new Set<string>();
        for (const w of selectedWNums) {
            const wNum = parseInt(w, 10);
            if (wNum > 0) candidates.add(pad2(wNum - 1));
            if (wNum < 99) candidates.add(pad2(wNum + 1));
        }
        // Keep only values that do not collide with existing placements and
        // are not winning numbers themselves.
        const validCandidates = Array.from(candidates).filter(c => !usedNumbers.has(c) && !winningNumbers.includes(c));
        const desiredNearMissCount = Math.min(8, validCandidates.length);
        const actualNearMissCount = Math.min(desiredNearMissCount, NUMBERS_COUNT - hitPositions.length);
        if (actualNearMissCount >= 4) {  // Ensure at least 4 near‑miss cells
            // Place near-miss values only on currently free cells.
            const freePositions = Array.from({ length: NUMBERS_COUNT }, (_, i) => i).filter(p => !hitPositions.includes(p));
            const chosenPositions = shuffle(freePositions).slice(0, actualNearMissCount);
            for (let i = 0; i < chosenPositions.length; i++) {
                const num = validCandidates[i % validCandidates.length];
                yourNumbers[chosenPositions[i]] = num;
                usedNumbers.add(num);
                nearMissPositions.push(chosenPositions[i]);
                nearMissNumbers.push(num);
            }
        }
    }
    // Fill all remaining cells with unique random numbers.
    // Losing tickets additionally forbid exact winning-number matches.
    for (let i = 0; i < NUMBERS_COUNT; i++) {
        if (yourNumbers[i] === undefined) {
            let candidate: string;
            do {
                candidate = pad2(randomInt(0, NUMBER_POOL_SIZE - 1));
            } while (usedNumbers.has(candidate) || (!isWinning && winningNumbers.includes(candidate)));
            yourNumbers[i] = candidate;
            usedNumbers.add(candidate);
        }
    }
    // Safety check: losing ticket must not contain any true winning number.
    if (!isWinning) {
        const invalid = yourNumbers.some(y => winningNumbers.includes(y));
        if (invalid) {
            // Very rare edge case: regenerate ticket to preserve contract.
            return generateTicket(bet, multiplierInfo, pattern, batchId, seq);
        }
    }
    const payout = hitAmounts.reduce((a, b) => a + b, 0);
    const winTier = getWinTier(payout, bet);
    // Ensure ticket_no is unique and non-empty before insert.
    const ticketNo = `${batchId}-${String(seq + 1).padStart(6, '0')}`;
    return {
        ticket_no: ticketNo,
        bet_amount: bet,
        multiplier: multiplierInfo.multiplier,
        hit_count: multiplierInfo.hitCount,
        payout,
        win_tier: winTier,
        winning_numbers: joinArray(winningNumbers),
        your_numbers: joinArray(yourNumbers),
        printed_amounts: joinArray(printedAmounts),
        hit_positions: joinArray(hitPositions),
        hit_amounts: joinArray(hitAmounts),
        near_miss_positions: nearMissPositions.length ? joinArray(nearMissPositions) : null,
        near_miss_numbers: nearMissNumbers.length ? joinArray(nearMissNumbers) : null,
        batch_id: batchId,
        seq_in_batch: seq,
        generated_at: new Date(),
        is_issued: false,
    };
}

function getWinTier(payout: number, bet: number): string {
    // Tier labels are derived from payout multiple (payout / bet).
    const mult = payout / bet;
    if (mult >= 2000) return 'JACKPOT';
    if (mult >= 50) return 'MEGA_WIN';
    if (mult >= 20) return 'SUPER_WIN';
    if (mult >= 10) return 'BIG_WIN';
    if (payout > 0) return 'WIN';
    return 'NO_WIN';
}

// Generates one database batch for a specific bet tier.
export async function generateBatch(bet: number, count: number): Promise<void> {
    // console.log('generateBatch', bet, count);
    if (!Number.isFinite(count) || !Number.isInteger(count)) {
        throw new Error(`Invalid ticket count (must be an integer): ${count}`);
    }
    if (count < MIN_TICKET_COUNT || count > MAX_TICKET_COUNT) {
        throw new Error(`Ticket count out of range: ${count}. Allowed range: ${MIN_TICKET_COUNT}-${MAX_TICKET_COUNT}`);
    }
    const multipliers = getMultipliersForBet(bet);
    if (multipliers.length === 0) {
        throw new Error(`No multiplier configuration found for bet ${bet}`);
    }
    const fallbackInfo = multipliers.find(m => m.hitCount === 0) ?? multipliers[0];
    // Prebuild target distribution from configured probabilities.
    const ticketConfigs: { info: MultiplierInfo, pattern: HitPattern | null }[] = [];
    for (const info of multipliers) {
        const expected = Math.round(info.probability / 100 * count);
        for (let i = 0; i < expected; i++) {
            if (info.hitCount === 0) {
                ticketConfigs.push({ info, pattern: null });
            } else {
                // For winning outcomes, randomly choose a valid hit pattern.
                const pattern = info.patterns[randomInt(0, info.patterns.length - 1)];
                ticketConfigs.push({ info, pattern });
            }
        }
    }
    // Compensate probability rounding gaps by filling with fallback entries.
    while (ticketConfigs.length < count) {
        ticketConfigs.push({ info: fallbackInfo, pattern: null });
    }
    // Shuffle so outcomes are not clustered by type.
    shuffle(ticketConfigs);
    // Create parent batch row first and reuse its id on all child tickets.
    const batchRes = await pool.query(
        'INSERT INTO batches (bet_amount, ticket_count) VALUES ($1, $2) RETURNING id',
        [bet, count]
    );
    const batchId = batchRes.rows[0].id;
    // Build ticket payloads, then insert in bounded chunks to avoid overly
    // large SQL statements and parameter lists.
    const chunkSize = Math.min(MAX_TICKET_COUNT, count);
    for (let i = 0; i < ticketConfigs.length; i += chunkSize) {
        const chunk = ticketConfigs.slice(i, i + chunkSize);
        const tickets = await Promise.all(chunk.map((cfg, idx) =>
            generateTicket(bet, cfg.info, cfg.pattern, batchId, i + idx)
        ));
        for (let off = 0; off < tickets.length; off += TICKET_INSERT_ROWS_PER_QUERY) {
            const slice = tickets.slice(off, off + TICKET_INSERT_ROWS_PER_QUERY);
            const rows = slice.map(t => [
                t.ticket_no, t.bet_amount, t.multiplier, t.hit_count, t.payout, t.win_tier,
                t.winning_numbers, t.your_numbers, t.printed_amounts, t.hit_positions,
                t.hit_amounts, t.near_miss_positions, t.near_miss_numbers,
                t.batch_id, t.seq_in_batch, t.generated_at, t.is_issued
            ]);
            const placeholders = rows
                .map((_, idx) => {
                    const base = idx * TICKET_INSERT_COLUMNS;
                    const rowParams = Array.from(
                        { length: TICKET_INSERT_COLUMNS },
                        (_, col) => `$${base + col + 1}`
                    );
                    return `(${rowParams.join(', ')})`;
                })
                .join(',');
            const flatValues: unknown[] = [];
            for (const row of rows) {
                for (const cell of row) {
                    flatValues.push(cell);
                }
            }
            await pool.query(`
                INSERT INTO tickets (
                    ticket_no, bet_amount, multiplier, hit_count, payout, win_tier,
                    winning_numbers, your_numbers, printed_amounts, hit_positions,
                    hit_amounts, near_miss_positions, near_miss_numbers,
                    batch_id, seq_in_batch, generated_at, is_issued
                ) VALUES ${placeholders}
            `, flatValues);
        }
    }
    console.log(`Batch ${batchId} for bet ${bet} generated with ${count} tickets`);
}