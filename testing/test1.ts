
import pool from '../config/database';
import { randomInt, distinctNumbers, shuffle, weightedRandom } from '../utils/random';
import { pad2, joinArray } from '../utils/formatters';
import { multiplierConfigs } from './MultiplierConfig';


export const BET_TIERS = [10];
export const MIN_TICKET_COUNT = 1000;
export const MAX_TICKET_COUNT = 10000;

const WINNING_NUMBERS_COUNT = 5;
const NUMBERS_COUNT = 20;
const NUMBER_POOL_SIZE = 100;

const TICKET_INSERT_COLUMNS = 17;
const TICKET_INSERT_ROWS_PER_QUERY = 500;

// Amount pools
const AMOUNT_POOLS = {
    LOW: { denominations: [1.5, 2, 2.5, 3, 4], count: 4 },
    MEDIUM: { denominations: [5, 6, 8, 10, 12, 15], count: 4 },
    HIGH: { denominations: [20, 25, 30, 40, 50], weights: [0.4, 0.3, 0.2, 0.08, 0.02], count: 6 },
    JACKPOT: { denominations: [200, 800], weights: [0.5, 0.5], count: 6 },
};


// Generate 20 printed amounts per ticket
function generatePrintedAmounts(): number[] {
    const low = Array.from({ length: AMOUNT_POOLS.LOW.count }, () =>
        AMOUNT_POOLS.LOW.denominations[randomInt(0, AMOUNT_POOLS.LOW.denominations.length - 1)]
    );
    const medium = Array.from({ length: AMOUNT_POOLS.MEDIUM.count }, () =>
        AMOUNT_POOLS.MEDIUM.denominations[randomInt(0, AMOUNT_POOLS.MEDIUM.denominations.length - 1)]
    );
    const high = Array.from({ length: AMOUNT_POOLS.HIGH.count }, () =>
        weightedRandom(AMOUNT_POOLS.HIGH.denominations, AMOUNT_POOLS.HIGH.weights)
    );
    const jackpot = Array.from({ length: AMOUNT_POOLS.JACKPOT.count }, () =>
        weightedRandom(AMOUNT_POOLS.JACKPOT.denominations, AMOUNT_POOLS.JACKPOT.weights)
    );
    return shuffle([...low, ...medium, ...high, ...jackpot]);
}

// Determine ticket win tier
function getWinTier(payout: number, bet: number): string {
    const mult = payout / bet;
    if (mult >= 200) return 'JACKPOT';
    if (mult >= 50) return 'MEGA_WIN';
    if (mult >= 20) return 'SUPER_WIN';
    if (mult >= 10) return 'BIG_WIN';
    if (payout > 0) return 'WIN';
    return 'NO_WIN';
}


async function generateTicket(
    bet: number,
    multiplier: number,
    pattern: { amounts: number[]; count: number },
    batchId: number,
    seq: number
) {
    const isWinning = pattern.amounts.length > 0;
    const hitCount = pattern.amounts.length;

    // Winning numbers
    const winningNumbers = distinctNumbers(WINNING_NUMBERS_COUNT, NUMBER_POOL_SIZE).map(pad2);

    // Printed amounts
    const printedAmounts = generatePrintedAmounts();

    // Hit numbers & positions
    const hitPositions: number[] = isWinning ? distinctNumbers(hitCount, NUMBERS_COUNT).sort((a,b)=>a-b) : [];
    const hitAmounts: number[] = isWinning ? pattern.amounts.map(a => Math.round(a * bet * 10) / 10) : [];
    const hitNumbers: string[] = isWinning ? shuffle([...winningNumbers]).slice(0, hitCount) : [];

    // Y-area numbers
    const yourNumbers: string[] = new Array(NUMBERS_COUNT);
    const usedNumbers = new Set<string>();
    const nearMissPositions: number[] = [];
    const nearMissNumbers: string[] = [];

    // Place hit numbers
    hitPositions.forEach((pos, i) => {
        yourNumbers[pos] = hitNumbers[i];
        usedNumbers.add(hitNumbers[i]);
    });

    // Near-miss numbers (losing ticket only)
    if (!isWinning) {
        const selectedWNums = shuffle([...winningNumbers]).slice(0, 4);
        const candidates = new Set<string>();
        selectedWNums.forEach(w => {
            const n = parseInt(w, 10);
            if (n > 0) candidates.add(pad2(n - 1));
            if (n < 99) candidates.add(pad2(n + 1));
        });
        const validCandidates = Array.from(candidates).filter(c => !usedNumbers.has(c) && !winningNumbers.includes(c));
        const freePositions = Array.from({ length: NUMBERS_COUNT }, (_, i) => i).filter(p => !hitPositions.includes(p));
        const nearCount = Math.min(4, validCandidates.length, freePositions.length);
        for (let i = 0; i < nearCount; i++) {
            yourNumbers[freePositions[i]] = validCandidates[i];
            nearMissPositions.push(freePositions[i]);
            nearMissNumbers.push(validCandidates[i]);
            usedNumbers.add(validCandidates[i]);
        }
    }

    // Fill remaining Y numbers randomly
    for (let i = 0; i < NUMBERS_COUNT; i++) {
        if (!yourNumbers[i]) {
            let candidate: string;
            do {
                candidate = pad2(randomInt(0, NUMBER_POOL_SIZE - 1));
            } while (usedNumbers.has(candidate) || (!isWinning && winningNumbers.includes(candidate)));
            yourNumbers[i] = candidate;
            usedNumbers.add(candidate);
        }
    }

    // Payout & tier
    const payout = hitAmounts.reduce((a,b)=>a+b,0);
    const winTier = getWinTier(payout, bet);

    const ticketNo = `${batchId}-${String(seq + 1).padStart(8, '0')}`;

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

async function insertTickets(tickets: any[]) {
    if (!tickets.length) return;

    const values = tickets.map(t => [
        t.ticket_no, t.bet_amount, t.multiplier, t.hit_count, t.payout, t.win_tier,
        t.winning_numbers, t.your_numbers, t.printed_amounts, t.hit_positions,
        t.hit_amounts, t.near_miss_positions, t.near_miss_numbers,
        t.batch_id, t.seq_in_batch, t.generated_at, t.is_issued
    ]);

    const placeholders = values.map((_, i) => {
        const base = i * TICKET_INSERT_COLUMNS;
        return `(${Array.from({ length: TICKET_INSERT_COLUMNS }, (_, j) => `$${base + j + 1}`).join(',')})`;
    }).join(',');

    await pool.query(
        `INSERT INTO tickets (
            ticket_no, bet_amount, multiplier, hit_count, payout, win_tier,
            winning_numbers, your_numbers, printed_amounts, hit_positions,
            hit_amounts, near_miss_positions, near_miss_numbers,
            batch_id, seq_in_batch, generated_at, is_issued
        ) VALUES ${placeholders}`,
        values.flat()
    );
}


export async function generateBatch(bet: number, totalCount: number) {
    const specs: { multiplier: number; pattern: { amounts: number[]; count: number } }[] = [];

    multiplierConfigs[bet].forEach(info => {
        info.patterns.forEach(pattern => {
            for (let i = 0; i < pattern.count; i++) {
                specs.push({ multiplier: info.multiplier, pattern });
            }
        });
    });

    shuffle(specs);

    const batchRes = await pool.query(
        'INSERT INTO batches (bet_amount, ticket_count) VALUES ($1, $2) RETURNING id',
        [bet, totalCount]
    );
    const batchId = batchRes.rows[0].id;

    const CHUNK_SIZE = 10000;
    for (let i = 0; i < specs.length; i += CHUNK_SIZE) {
        const chunk = specs.slice(i, i + CHUNK_SIZE);
        const tickets = await Promise.all(chunk.map((spec, idx) =>
            generateTicket(bet, spec.multiplier, spec.pattern, batchId, i + idx)
        ));

        // Insert in smaller sub-chunks
        for (let j = 0; j < tickets.length; j += TICKET_INSERT_ROWS_PER_QUERY) {
            await insertTickets(tickets.slice(j, j + TICKET_INSERT_ROWS_PER_QUERY));
        }
    }

    console.log(`🎉 Batch ${batchId} generated: ${totalCount} tickets for bet ${bet}`);
}


export function calculateRTP(configs: any[], bet: number) {
    let totalTickets = 0, totalPayout = 0;
    configs.forEach((c: { patterns: { amounts: number[]; count: number }[] }) => {
        c.patterns.forEach((p: { amounts: number[]; count: number }) => {
            const payoutPerTicket = p.amounts.reduce((sum:number,a:number)=>sum+a,0) * bet;
            totalTickets += p.count;
            totalPayout += payoutPerTicket * p.count;
        });
    });
    const totalBet = totalTickets * bet;
    return (totalPayout / totalBet) * 100;
}

export function calculateWinRate(configs: any[]) {
    let totalTickets = 0, winningTickets = 0;
    configs.forEach((c: { patterns: { amounts: number[]; count: number }[] }) => c.patterns.forEach((p: { amounts: number[]; count: number }) => {
        totalTickets += p.count;
        if (p.amounts.length > 0) winningTickets += p.count;
    }));
    return (winningTickets / totalTickets) * 100;
}