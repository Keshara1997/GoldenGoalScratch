import pool from '../config/database';
import { randomInt, distinctNumbers, shuffle, weightedRandom } from '../utils/random';
import { pad2, joinArray } from '../utils/formatters';
import { getMultiplierConfigsForBet } from './MultiplierConfig';

// ==============================================
// Configuration constants for ticket generation
// ==============================================
// export const BET_TIERS = [1, 2, 4, 8, 10, 20, 40, 80, 100, 200, 400, 800, 1000];
export const BET_TIERS = [1];

// Only bet amount 10 is used
export const MIN_TICKET_COUNT = 1000;
export const MAX_TICKET_COUNT = 10000;
const WINNING_NUMBERS_COUNT = 5;                  // How many winning numbers are drawn
const NUMBERS_COUNT = 20;                         // How many numbers appear on a ticket (Y‑area)
const NUMBER_POOL_SIZE = 100;                     // Numbers range from 00 to 99
const TICKET_INSERT_COLUMNS = 17;                 // Number of columns in tickets table
const TICKET_INSERT_ROWS_PER_QUERY = 500;         // Batch size for inserting tickets

// ==============================================
// Configuration for printed amounts (the face values on the ticket)
// ==============================================
const AMOUNT_POOLS = {
    LOW: { denominations: [1.5, 2, 2.5, 3, 4], count: 4 },
    MEDIUM: { denominations: [5, 6, 8, 10, 12, 15], count: 4 },
    HIGH: { denominations: [20, 25, 30, 40, 50], weights: [0.4, 0.3, 0.2, 0.08, 0.02], count: 6 },
    JACKPOT: { denominations: [200, 800], weights: [0.5, 0.5], count: 6 },
};

/**
 * Generate an array of 20 printed amounts for a ticket.
 * The amounts are drawn from different pools (LOW, MEDIUM, HIGH, JACKPOT)
 * with specified counts and weighted random selection.
 */
function generatePrintedAmounts(amounts: number[]): number[] {
    // Generate LOW amounts: randomly pick from LOW.denominations, count = 4
    const low = Array.from({ length: AMOUNT_POOLS.LOW.count }, () => {
        const idx = randomInt(0, AMOUNT_POOLS.LOW.denominations.length - 1);
        return AMOUNT_POOLS.LOW.denominations[idx];
    });
    // Generate MEDIUM amounts: randomly pick from MEDIUM.denominations, count = 4
    const medium = Array.from({ length: AMOUNT_POOLS.MEDIUM.count }, () => {
        const idx = randomInt(0, AMOUNT_POOLS.MEDIUM.denominations.length - 1);
        return AMOUNT_POOLS.MEDIUM.denominations[idx];
    });
    // Generate HIGH amounts: weighted random from HIGH.denominations, count = 6
    const high = Array.from({ length: AMOUNT_POOLS.HIGH.count }, () => {
        return weightedRandom(AMOUNT_POOLS.HIGH.denominations, AMOUNT_POOLS.HIGH.weights);
    });
    // Generate JACKPOT amounts: weighted random from JACKPOT.denominations, count = 6
    const jackpot = Array.from({ length: AMOUNT_POOLS.JACKPOT.count }, () => {
        return weightedRandom(AMOUNT_POOLS.JACKPOT.denominations, AMOUNT_POOLS.JACKPOT.weights);
    });
    // Combine all amounts and shuffle them so the order on the ticket is random
    const all = [...low, ...medium, ...high, ...jackpot];
    return shuffle(all);
}
// function generatePrintedAmounts(amounts: number[]): number[] {
//     // console.log('amounts', amounts);

//     const TOTAL_COUNT =
//         AMOUNT_POOLS.LOW.count +
//         AMOUNT_POOLS.MEDIUM.count +
//         AMOUNT_POOLS.HIGH.count +
//         AMOUNT_POOLS.JACKPOT.count;

//     // Step 1: Start with required amounts (must be included)
//     const result: number[] = [...amounts];

//     // Step 2: Helper functions
//     const pickLow = () => {
//         const idx = randomInt(0, AMOUNT_POOLS.LOW.denominations.length - 1);
//         return AMOUNT_POOLS.LOW.denominations[idx];
//     };

//     const pickMedium = () => {
//         const idx = randomInt(0, AMOUNT_POOLS.MEDIUM.denominations.length - 1);
//         return AMOUNT_POOLS.MEDIUM.denominations[idx];
//     };

//     const pickHigh = () => {
//         return weightedRandom(
//             AMOUNT_POOLS.HIGH.denominations,
//             AMOUNT_POOLS.HIGH.weights
//         );
//     };

//     const pickJackpot = () => {
//         return weightedRandom(
//             AMOUNT_POOLS.JACKPOT.denominations,
//             AMOUNT_POOLS.JACKPOT.weights
//         );
//     };

//     // Step 3: Fill remaining slots
//     while (result.length < TOTAL_COUNT) {
//         // Randomly choose a pool
//         const poolType = randomInt(1, 4);

//         let value: number;

//         switch (poolType) {
//             case 1:
//                 value = pickLow();
//                 break;
//             case 2:
//                 value = pickMedium();
//                 break;
//             case 3:
//                 value = pickHigh();
//                 break;
//             case 4:
//                 value = pickJackpot();
//                 break;
//         }

//         result.push(value!);
//     }

//     // Step 4: Shuffle final result
//     return shuffle(result);
// }
/**
 * Generate a single ticket record.
 *
 * RULE: If a winning number appears in the ‘Your Numbers’ section,
 * the ticket is considered winning. The win amount is the sum of the
 * printed amounts at the positions where winning numbers appear,
 * multiplied by the bet and the ticket's multiplier.
 *
 * Generation order (as required):
 * 1. Generate the official winning numbers (5 unique numbers).
 * 2. Generate the 20 printed amounts (face values) for the ticket.
 * 3. For winning tickets: place the pattern’s amounts at the designated hit positions.
 * 4. Build the Y‑area numbers: place the winning numbers at those hit positions,
 *    then add near‑miss (if losing) and random numbers.
 *
 * @param bet - The bet amount (e.g., 10)
 * @param multiplier - The multiplier applied to the pattern amounts (e.g., 1.5)
 * @param pattern - Contains `amounts` (list of base multipliers) and `count` (how many tickets of this pattern)
 * @param batchId - ID of the batch this ticket belongs to
 * @param seq - Sequential index within the batch
 * @returns A ticket object ready for insertion
 */
async function generateTicket(
    bet: number,
    multiplier: number,
    pattern: { amounts: number[]; count: number },
    batchId: number,
    seq: number
): Promise<any> {

    // Determine if this ticket is a winning ticket: pattern.amounts non‑empty means winning cells exist
    const isWinning = pattern.amounts.length > 0;
    // Number of winning cells on this ticket (each cell corresponds to a printed amount)
    const hitCount = pattern.amounts.length;

    // ========== Step 1: Generate the official winning numbers ==========
    // Draw 5 unique numbers from 0..99, format as two‑digit strings
    const winningNumbers = distinctNumbers(WINNING_NUMBERS_COUNT, NUMBER_POOL_SIZE).map(pad2);
    // ========== Step 2: Generate the 20 printed amounts (face values) ==========
    // This creates a random array of 20 amounts from the predefined pools
    const printedAmounts = generatePrintedAmounts(pattern.amounts);
    // console.log('printedAmounts', printedAmounts);
    // ========== Step 3: Prepare hit positions and amounts ==========
    let hitPositions: number[] = [];   // Indices (0‑19) where a winning number appears in Y‑area
    let hitAmounts: number[] = [];     // Actual payout amounts for those hits
    let hitNumbers: string[] = [];     // The winning numbers that appear in those cells

    if (isWinning) {
        // Choose unique positions for the hits (no two hits on the same cell)
        hitPositions = distinctNumbers(hitCount, NUMBERS_COUNT).sort((a, b) => a - b);

        // IMPORTANT: Place the pattern's amounts at those positions in the printed amounts array.
        // This ensures that the printed amount at a hit position is exactly the pattern amount.
        for (let i = 0; i < hitPositions.length; i++) {
            printedAmounts[hitPositions[i]] = pattern.amounts[i];
        }

        // Calculate hit amounts: pattern.amounts * bet * multiplier, rounded to 1 decimal
        hitAmounts = pattern.amounts.map((amt: number) => amt * bet);

        // Assign distinct winning numbers to the hit cells (take first `hitCount` from shuffled winningNumbers)
        hitNumbers = shuffle([...winningNumbers]).slice(0, hitCount);
    }

    // ========== Step 4: Build the Y‑area numbers (20 cells) ==========
    let yourNumbers: string[] = new Array(NUMBERS_COUNT);
    let usedNumbers = new Set<string>();               // Track numbers already placed
    let nearMissPositions: number[] = [];              // Positions that are near‑miss (if losing)
    let nearMissNumbers: string[] = [];

    // Place hit numbers at their designated positions
    for (let i = 0; i < hitPositions.length; i++) {
        const pos = hitPositions[i];
        yourNumbers[pos] = hitNumbers[i];
        usedNumbers.add(hitNumbers[i]);
    }

    // ========== Step 5: Near‑miss handling (only for losing tickets) ==========
    // For losing tickets (hitCount == 0) we want to create near‑miss situations:
    // some cells contain numbers that are one away from a winning number, creating an illusion of almost winning.
    if (!isWinning) {
        // Choose 4 of the 5 winning numbers
        const selectedWNums = shuffle([...winningNumbers]).slice(0, 4);
        // For each selected winning number, generate its adjacent numbers (n-1 and n+1)
        const candidates = new Set<string>();
        for (const w of selectedWNums) {
            const wNum = parseInt(w, 10);
            if (wNum > 0) candidates.add(pad2(wNum - 1));
            if (wNum < 99) candidates.add(pad2(wNum + 1));
        }
        // Filter out numbers that are already used or are winning numbers themselves
        const validCandidates = Array.from(candidates).filter(c => !usedNumbers.has(c) && !winningNumbers.includes(c));
        // We aim for up to 8 near‑miss cells, but at least 4 if possible
        const desiredNearMissCount = Math.min(8, validCandidates.length);
        const actualNearMissCount = Math.min(desiredNearMissCount, NUMBERS_COUNT - hitPositions.length);
        if (actualNearMissCount >= 4) {
            // Find free positions (not occupied by hits)
            const freePositions = Array.from({ length: NUMBERS_COUNT }, (_, i) => i).filter(p => !hitPositions.includes(p));
            // Sort free positions by printed amount descending – higher amounts get near‑miss more often
            const positionsByAmount = freePositions.sort((a, b) => printedAmounts[b] - printedAmounts[a]);
            const chosenPositions = positionsByAmount.slice(0, actualNearMissCount);
            // Assign near‑miss numbers (cycle through valid candidates if needed)
            for (let i = 0; i < chosenPositions.length; i++) {
                const num = validCandidates[i % validCandidates.length];
                yourNumbers[chosenPositions[i]] = num;
                usedNumbers.add(num);
                nearMissPositions.push(chosenPositions[i]);
                nearMissNumbers.push(num);
            }
        }
    }

    // ========== Step 6: Fill the remaining cells with random numbers ==========
    // Ensure no duplicate numbers and for losing tickets ensure no winning number appears.
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

    // ========== Step 7: Safety validation for losing tickets ==========
    // Ensure no Y‑area number equals any winning number (otherwise the ticket would be winning)
    if (!isWinning) {
        const invalid = yourNumbers.some(y => winningNumbers.includes(y));
        if (invalid) {
            // Recursively regenerate this ticket (very rare case, but guarantees correctness)
            return generateTicket(bet, multiplier, pattern, batchId, seq);
        }
    }

    // ========== Step 8: Compute payout and win tier ==========
    const payout = hitAmounts.reduce((a, b) => a + b, 0);
    const winTier =  getWinTier(payout, bet);
    const ticketNo = `${batchId}-${String(seq + 1).padStart(8, '0')}`;

    // ========== Step 9: Return the complete ticket object ==========
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

/**
 * Determine the win tier based on payout relative to bet.
 */
function getWinTier(payout: number, bet: number): string {
    const mult = payout / bet;
    if (mult >= 200) return 'JACKPOT';
    if (mult >= 50) return 'MEGA_WIN';
    if (mult >= 20) return 'SUPER_WIN';
    if (mult >= 10) return 'BIG_WIN';
    if (payout > 0) return 'WIN';
    return 'NO_WIN';
}

/**
 * Generate a batch of tickets for a given bet amount and count.
 *
 * This function:
 * - Builds ticket specifications from the multiplier config for this bet and shuffles them.
 * - Creates a batch record.
 * - Generates tickets in chunks, inserts them in smaller batches,
 * - Logs progress after each insert, and throttles to protect the database.
 *
 * @param bet - The bet amount (e.g., 10)
 * @param count - Number of tickets to generate (should match the sum of pattern counts)
 */
export async function generateBatch(bet: number, count: number): Promise<void> {
    // ========== Step 1: Build and shuffle ticket specifications ==========
    // Each spec contains a multiplier and a pattern (see getMultiplierConfigsForBet),
    // and each pattern has a `count` indicating how many tickets of that type should exist.
    // Shuffle config order and per-row pattern order so we never follow the static list order.
    const specs: { multiplier: number; pattern: { amounts: number[]; count: number } }[] = [];
    const configRows = shuffle(getMultiplierConfigsForBet(bet));
    // const configRows = getMultiplierConfigsForBet(bet);
    for (const info of configRows) {
        for (const pattern of shuffle(info.patterns)) {
            // Duplicate the pattern `pattern.count` times
            for (let i = 0; i < pattern.count; i++) {
                // console.log('pattern', i,'info', info, 'pattern', pattern);
                specs.push({ multiplier: info.multiplier, pattern });
            }
        }
    }
    // The total number of specs should equal the desired count (10,000,000 by design)
    if (specs.length !== count) {
        console.warn(`Total spec count ${specs.length} does not equal 10,000,000`);
    }

    // Shuffle the specs (shuffle() returns a new array; must assign — otherwise order stays sequential).
    const shuffledSpecs = shuffle(specs);
    // ex: shuffledSpecs length should be 10,000,000
    // ex: shuffledSpecs length should be 10,000,000
    // ========== Step 2: Create a batch record in the database ==========
    const batchRes = await pool.query(
        'INSERT INTO batches (bet_amount, ticket_count) VALUES ($1, $2) RETURNING id',
        [bet, count]
    );
    // console.log('batchRes', batchRes);
    const batchId = batchRes.rows[0].id;

    // ========== Step 3: Configure insertion parameters ==========
    const GENERATION_CHUNK_SIZE = 10000;      // How many tickets to generate in parallel
    const INSERT_BATCH_SIZE = 500;            // Number of tickets inserted in one database call
    const THROTTLE_DELAY_MS = 10;             // Delay after each insert to control load

    let totalInserted = 0;                    // Cumulative count of inserted tickets

    // Helper to pause execution
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // ========== Step 4: Generate and insert tickets in chunks ==========
    for (let i = 0; i < shuffledSpecs.length; i += GENERATION_CHUNK_SIZE) {
        // Take a chunk of specs
        const chunk = shuffledSpecs.slice(i, i + GENERATION_CHUNK_SIZE);

        // Generate tickets for this chunk in parallel (fast)
        const tickets = await Promise.all(
            
            chunk.map((spec, idx) =>
                generateTicket(bet, spec.multiplier, spec.pattern, batchId, i + idx)
            )
        );
        console.log('tickets', tickets.map(t => t.printed_amounts).flat());

        // Insert the generated tickets in smaller batches to avoid huge queries and to log progress
        for (let off = 0; off < tickets.length; off += INSERT_BATCH_SIZE) {
            const ticketSlice = tickets.slice(off, off + INSERT_BATCH_SIZE);

            // Build the values array for the INSERT statement
            const values = ticketSlice.map(t => [
                t.ticket_no, t.bet_amount, t.multiplier, t.hit_count, t.payout, t.win_tier,
                t.winning_numbers, t.your_numbers, t.printed_amounts, t.hit_positions,
                t.hit_amounts, t.near_miss_positions, t.near_miss_numbers,
                t.batch_id, t.seq_in_batch, t.generated_at, t.is_issued
            ]);

            // Generate placeholders like ($1,$2,...), ($3,$4,...), ...
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

            // Flatten all values into a single array
            const flatValues: unknown[] = [];
            for (const row of values) {
                for (const cell of row) {
                    flatValues.push(cell);
                }
            }

            // Execute the insert
            await pool.query(`
                INSERT INTO tickets (
                    ticket_no, bet_amount, multiplier, hit_count, payout, win_tier,
                    winning_numbers, your_numbers, printed_amounts, hit_positions,
                    hit_amounts, near_miss_positions, near_miss_numbers,
                    batch_id, seq_in_batch, generated_at, is_issued
                ) VALUES ${placeholders}
            `, flatValues);

            // Update cumulative counter and log progress
            totalInserted += ticketSlice.length;
            const percent = (totalInserted / shuffledSpecs.length) * 100;
            console.log(`Inserted ${totalInserted} / ${shuffledSpecs.length} tickets (${percent.toFixed(2)}%)`);

            // Throttle: wait a bit to avoid overloading the database
            await sleep(THROTTLE_DELAY_MS);
        }
    }

    // ========== Step 5: Final verification ==========
    if (totalInserted !== shuffledSpecs.length) {
        console.warn(`Batch ${batchId}: Inserted ${totalInserted} tickets, but expected ${shuffledSpecs.length}`);
    } else {
        console.log(`Batch ${batchId} for bet ${bet} successfully generated with ${totalInserted} tickets.`);
    }
}