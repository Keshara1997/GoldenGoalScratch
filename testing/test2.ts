
import pool from '../config/database';
import { randomInt, distinctNumbers, shuffle, weightedRandom } from '../utils/random';
import { pad2, joinArray } from '../utils/formatters';
import { multiplierConfigs } from './MultiplierConfig';

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
    // Step 1: Read the incoming ticket blueprint (bet, multiplier, and hit pattern).
    // A non-empty pattern means this ticket is a winning ticket.
    const isWinning = pattern.amounts.length > 0;
    // Step 2: Derive how many hit cells must be placed on this ticket.
    const hitCount = pattern.amounts.length;
    

    // Step 3: Generate the 5 unique winning numbers shown at the top of the ticket.
    const winningNumbers = distinctNumbers(WINNING_NUMBERS_COUNT, NUMBER_POOL_SIZE).map(pad2);
    // winningNumbers = [01,02,03,04,05]

    // Step 4: Generate the 20 printed amount cells for the ticket face.
    const printedAmounts = generatePrintedAmounts();
    // printedAmounts = [1.5,2,2.5,3,4,5,6,8,10,12,15,20,25,30,40,50,200,800]

    // Step 5: Prepare containers for hit metadata.
    // These remain empty for losing tickets.
    let hitPositions: number[] = [];
    let hitAmounts: number[] = [];
    let hitNumbers: string[] = [];

    if (isWinning) {
        // hitCount = 1, pattern.amounts = [1.5]
        // Step 6 (winning only): Choose distinct positions where hits will appear.
        hitPositions = distinctNumbers(hitCount, NUMBERS_COUNT).sort((a,b)=>a-b);
        // hitPositions = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19]
        // Step 7 (winning only): Convert pattern multipliers to payout amounts.
        hitAmounts = pattern.amounts.map((amt: number) => Math.round(amt * bet * 10) / 10);
        // hitAmounts = [1.5]
        // Step 8 (winning only): Assign winning numbers to those hit positions.
        hitNumbers = shuffle([...winningNumbers]).slice(0, hitCount);
        // shuffle([01,02,03,04,05]) = [03,01,05,02,04]
    }

    // Step 9: Initialize the 20 "your numbers" cells and tracking state.
    let yourNumbers: string[] = new Array(NUMBERS_COUNT);
    let usedNumbers = new Set<string>();
    let nearMissPositions: number[] = [];
    let nearMissNumbers: string[] = [];

    // Step 10: Place all guaranteed hit numbers first.
    for (let i = 0; i < hitPositions.length; i++) {
        const pos = hitPositions[i];
        yourNumbers[pos] = hitNumbers[i];
        usedNumbers.add(hitNumbers[i]);
    }

    // Step 11 (losing only): Inject near-miss numbers so losing tickets feel close.
    if (!isWinning) {
        // 11a: Pick 4 winning numbers, then build +/-1 near-miss candidates.
        const selectedWNums = shuffle([...winningNumbers]).slice(0, 4);
        const candidates = new Set<string>();
        for (const w of selectedWNums) {
            const wNum = parseInt(w, 10);
            if (wNum > 0) candidates.add(pad2(wNum - 1));
            if (wNum < 99) candidates.add(pad2(wNum + 1));
        }
        // 11b: Remove conflicts (already used numbers and true winning numbers).
        const validCandidates = Array.from(candidates).filter(c => !usedNumbers.has(c) && !winningNumbers.includes(c));
        const desiredNearMissCount = Math.min(8, validCandidates.length);
        const actualNearMissCount = Math.min(desiredNearMissCount, NUMBERS_COUNT - hitPositions.length);
        if (actualNearMissCount >= 4) {  // Ensure at least 4 near‑miss cells
            // 11c: Choose free positions and prioritize higher printed-amount cells.
            const freePositions = Array.from({ length: NUMBERS_COUNT }, (_, i) => i).filter(p => !hitPositions.includes(p));
            const positionsByAmount = freePositions.sort((a,b) => printedAmounts[b] - printedAmounts[a]);
            const chosenPositions = positionsByAmount.slice(0, actualNearMissCount);
            // 11d: Place near-miss numbers into the selected cells.
            for (let i = 0; i < chosenPositions.length; i++) {
                const num = validCandidates[i % validCandidates.length];
                yourNumbers[chosenPositions[i]] = num;
                usedNumbers.add(num);
                nearMissPositions.push(chosenPositions[i]);
                nearMissNumbers.push(num);
            }
        }
    }

    // Step 12: Fill all remaining empty cells with valid unique random numbers.
    // Losing tickets are prevented from containing exact winning numbers.
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

    // Step 13: Final safety check for losing tickets; regenerate if invariant is broken.
    if (!isWinning) {
        const invalid = yourNumbers.some(y => winningNumbers.includes(y));
        if (invalid) {
            // Rare guard path to guarantee correctness.
            return generateTicket(bet, multiplier, pattern, batchId, seq);
        }
    }

    // Step 14: Compute payout and classify ticket tier.
    const payout = hitAmounts.reduce((a,b)=>a+b,0);
    const winTier = getWinTier(payout, bet);

    // Step 15: Build the ticket payload that will be inserted into the database.
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
    // Step 1: Build the full ticket spec list using configured pattern counts.
    const specs: { multiplier: number; pattern: { amounts: number[]; count: number } }[] = [];
    for (const info of multiplierConfigs[bet]) {
        for (const pattern of info.patterns) {
            for (let i = 0; i < pattern.count; i++) {
                specs.push({ multiplier: info.multiplier, pattern });
            }
        }
    }

    // Step 2: Validate expected distribution size.
    // (This warning helps catch config mistakes early.)
    if (specs.length !== 10_000_000) {
        console.warn(`Total spec count ${specs.length} does not equal 10,000,000`);
    }

    // Step 3: Shuffle so ticket outcomes are randomized across the batch.
    shuffle(specs);

    // Step 4: Create the parent batch row and capture its generated id.
    const batchRes = await pool.query(
        'INSERT INTO batches (bet_amount, ticket_count) VALUES ($1, $2) RETURNING id',
        [bet, count]
    );
    const batchId = batchRes.rows[0].id;

    // Step 5: Process specs in chunks to control memory and DB pressure.
    const chunkSize = 10000;
    for (let i = 0; i < specs.length; i += chunkSize) {
        // 5a: Materialize one chunk of specs and generate ticket payloads in parallel.
        const chunk = specs.slice(i, i + chunkSize);
        const tickets = await Promise.all(
            // bet = 10, spec.multiplier = 1.5, spec.pattern = { amounts: [1.5], count: 1143530 }
            chunk.map((spec, idx) => generateTicket(bet, spec.multiplier, spec.pattern, batchId, i + idx))
        );

        // 5b: Insert generated tickets in smaller SQL batches.
        for (let off = 0; off < tickets.length; off += TICKET_INSERT_ROWS_PER_QUERY) {
            const ticketSlice = tickets.slice(off, off + TICKET_INSERT_ROWS_PER_QUERY);
            const values = ticketSlice.map(t => [
                t.ticket_no, t.bet_amount, t.multiplier, t.hit_count, t.payout, t.win_tier,
                t.winning_numbers, t.your_numbers, t.printed_amounts, t.hit_positions,
                t.hit_amounts, t.near_miss_positions, t.near_miss_numbers,
                t.batch_id, t.seq_in_batch, t.generated_at, t.is_issued
            ]);

            // 5c: Build positional placeholders for a multi-row parameterized insert.
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

            // 5d: Flatten row matrices to match placeholder order.
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

    // Step 6: Log completion when all chunks are inserted.
    console.log(`Batch ${batchId} for bet ${bet} generated with ${count} tickets`);
}