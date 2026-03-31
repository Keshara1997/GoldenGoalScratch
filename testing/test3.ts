
import pool from '../config/database';
import { randomInt, distinctNumbers, shuffle, weightedRandom } from '../utils/random';
import { pad2, joinArray } from '../utils/formatters';
import { multiplierConfigs_10K } from './MultiplierConfig';

// const BET_TIERS = [1,2,4,8,10,20,40,80,100,200,400,800,1000];
// const WINNING_NUMBERS_COUNT = 5;
// const YOUR_NUMBERS_COUNT = 20;
// const NUMBER_POOL_SIZE = 100;

// export const BET_TIERS = [1,2,4,8,10,20,40,80,100,200,400,800,1000];
export const BET_TIERS = [10];
export const MIN_TICKET_COUNT = 1000;
export const MAX_TICKET_COUNT = 10000;
const WINNING_NUMBERS_COUNT = 5;
const NUMBERS_COUNT = 20;
const NUMBER_POOL_SIZE = 100;
const TICKET_INSERT_COLUMNS = 17;
const TICKET_INSERT_ROWS_PER_QUERY = 500;


const AMOUNT_POOLS = {
    LOW: { denominations: [1.5,2,2.5,3,4], count: 4 },
    MEDIUM: { denominations: [5,6,8,10,12,15], count: 4 },
    HIGH: { denominations: [20,25,30,40,50], weights: [0.4,0.3,0.2,0.08,0.02], count: 6 },
    JACKPOT: { denominations: [200,800], weights: [0.5,0.5], count: 6 },
};

// Helper: generate printed amounts (20 cells)
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

// Generate a single ticket
async function generateTicket(
    bet: number,
    multiplier: number,
    pattern: { amounts: number[]; count: number },
    batchId: number,
    seq: number
): Promise<any> {
    const isWinning = pattern.amounts.length > 0;
    const hitCount = pattern.amounts.length;

    // 1. Winning numbers (5 unique)
    const winningNumbers = distinctNumbers(WINNING_NUMBERS_COUNT, NUMBER_POOL_SIZE).map(pad2);

    // 2. Printed amounts (20 face values)
    const printedAmounts = generatePrintedAmounts();

    // 3. Hit positions and hit amounts
    let hitPositions: number[] = [];
    let hitAmounts: number[] = [];
    let hitNumbers: string[] = [];

    if (isWinning) {
        // Select hit positions (distinct)
        hitPositions = distinctNumbers(hitCount, NUMBERS_COUNT).sort((a,b)=>a-b);
        // Hit amounts = pattern amounts × bet, rounded to 1 decimal
        hitAmounts = pattern.amounts.map((amt: number) => Math.round(amt * bet * 10) / 10);
        // Hit numbers: choose distinct winning numbers (enough because winningNumbers length 5)
        hitNumbers = shuffle([...winningNumbers]).slice(0, hitCount);
    }

    // 4. Y‑area numbers
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

    // Near‑miss (only if losing round, i.e., hitCount == 0)
    if (!isWinning) {
        // Choose 4 winning numbers for near‑miss
        const selectedWNums = shuffle([...winningNumbers]).slice(0, 4);
        const candidates = new Set<string>();
        for (const w of selectedWNums) {
            const wNum = parseInt(w, 10);
            if (wNum > 0) candidates.add(pad2(wNum - 1));
            if (wNum < 99) candidates.add(pad2(wNum + 1));
        }
        // Filter out used numbers and winning numbers
        const validCandidates = Array.from(candidates).filter(c => !usedNumbers.has(c) && !winningNumbers.includes(c));
        const desiredNearMissCount = Math.min(8, validCandidates.length);
        const actualNearMissCount = Math.min(desiredNearMissCount, NUMBERS_COUNT - hitPositions.length);
        if (actualNearMissCount >= 4) {  // Ensure at least 4 near‑miss cells
            // Choose positions for near‑miss (avoid hit positions)
            const freePositions = Array.from({ length: NUMBERS_COUNT }, (_, i) => i).filter(p => !hitPositions.includes(p));
            // Sort free positions by printed amount descending (Jackpot > High > Medium > Low)
            const positionsByAmount = freePositions.sort((a,b) => printedAmounts[b] - printedAmounts[a]);
            const chosenPositions = positionsByAmount.slice(0, actualNearMissCount);
            for (let i = 0; i < chosenPositions.length; i++) {
                const num = validCandidates[i % validCandidates.length];
                yourNumbers[chosenPositions[i]] = num;
                usedNumbers.add(num);
                nearMissPositions.push(chosenPositions[i]);
                nearMissNumbers.push(num);
            }
        }
    }

    // Fill remaining cells with random numbers
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

    // Validation for losing rounds: no Y number equals any winning number
    if (!isWinning) {
        const invalid = yourNumbers.some(y => winningNumbers.includes(y));
        if (invalid) {
            // Regenerate Y numbers (should be rare)
            return generateTicket(bet, multiplier, pattern, batchId, seq);
        }
    }

    const payout = hitAmounts.reduce((a,b)=>a+b,0);
    const winTier = getWinTier(payout, bet);
    const ticketNo = ''; // will be set when issued

    return {
        ticket_no: ticketNo,
        bet_amount: bet,
        multiplier,
        hit_count: hitCount,
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
    const mult = payout / bet;
    if (mult >= 200) return 'JACKPOT';
    if (mult >= 50) return 'MEGA_WIN';
    if (mult >= 20) return 'SUPER_WIN';
    if (mult >= 10) return 'BIG_WIN';
    if (payout > 0) return 'WIN';
    return 'NO_WIN';
}

// Batch generation
export async function generateBatch(bet: number, count: number): Promise<void> {
    // Build list of ticket specs (multiplier, pattern) with the exact counts
    const specs: { multiplier: number; pattern: { amounts: number[]; count: number } }[] = [];
    for (const info of multiplierConfigs_10K) {
        for (const pattern of info.patterns) {
            for (let i = 0; i < pattern.count; i++) {
                specs.push({ multiplier: info.multiplier, pattern });
            }
        }
    }
    // specs length should be exactly 10,000,000 (sum of all pattern counts)
    if (specs.length !== 10_000_000) {
        console.warn(`Total spec count ${specs.length} does not equal 10,000,000`);
    }

    // Shuffle the specs
    shuffle(specs);

    // Insert batch record
    const batchRes = await pool.query(
        'INSERT INTO batches (bet_amount, ticket_count) VALUES ($1, $2) RETURNING id',
        [bet, count]
    );
    const batchId = batchRes.rows[0].id;

    // Generate and insert tickets in chunks
    const chunkSize = 10000;
    for (let i = 0; i < specs.length; i += chunkSize) {
        const chunk = specs.slice(i, i + chunkSize);
        const tickets = await Promise.all(
            chunk.map((spec, idx) => generateTicket(bet, spec.multiplier, spec.pattern, batchId, i + idx))
        );
        for (let off = 0; off < tickets.length; off += TICKET_INSERT_ROWS_PER_QUERY) {
            const ticketSlice = tickets.slice(off, off + TICKET_INSERT_ROWS_PER_QUERY);
            const values = ticketSlice.map(t => [
                t.ticket_no, t.bet_amount, t.multiplier, t.hit_count, t.payout, t.win_tier,
                t.winning_numbers, t.your_numbers, t.printed_amounts, t.hit_positions,
                t.hit_amounts, t.near_miss_positions, t.near_miss_numbers,
                t.batch_id, t.seq_in_batch, t.generated_at, t.is_issued
            ]);

            const placeholders = values
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
            for (const row of values) {
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