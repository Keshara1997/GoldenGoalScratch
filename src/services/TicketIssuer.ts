import pool from '../config/database';
import { randomInt } from '../utils/random';

export async function issueTicket(bet: number, userId: string): Promise<any> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Select oldest unissued ticket for this bet, skip locked
        const res = await client.query(`
            SELECT * FROM tickets
            WHERE bet_amount = $1 AND is_issued = FALSE
            ORDER BY id ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        `, [bet]);
        if (res.rows.length === 0) {
            await client.query('ROLLBACK');
            return null; // no ticket available
        }
        const ticket = res.rows[0];
        // Mark as issued
        await client.query(`
            UPDATE tickets SET is_issued = TRUE, issued_at = NOW()
            WHERE id = $1
        `, [ticket.id]);
        // Generate ticket number
        const ticketNo = generateTicketNumber(ticket);
        await client.query(`
            UPDATE tickets SET ticket_no = $1 WHERE id = $2
        `, [ticketNo, ticket.id]);
        // Create game round (credit not yet done)
        const roundId = generateRoundId();
        await client.query(`
            INSERT INTO game_rounds (round_id, user_id, bet_amount, ticket_no, payout, profit, is_win, win_tier)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [roundId, userId, ticket.bet_amount, ticketNo, ticket.payout, ticket.payout - ticket.bet_amount,
            ticket.payout > 0, ticket.win_tier]);
        await client.query('COMMIT');
        return { ticket, roundId, ticketNo };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

function generateTicketNumber(ticket: any): string {
    const date = new Date();
    const yyyymmdd = date.toISOString().slice(0,10).replace(/-/g,'');
    // 14-digit random (or encode bet/batch/seq)
    const code = Array.from({ length: 14 }, () => randomInt(0,9)).join('');
    const check = checksum(code);
    return `NO.${yyyymmdd}-${code}-${check}`;
}

function generateRoundId(): string {
    return `RND-${Date.now()}-${randomInt(1000,9999)}`;
}

function checksum(s: string): string {
    let sum = 0;
    for (let i = 0; i < s.length; i++) {
        let digit = parseInt(s[i],10);
        if (i % 2 === 0) digit *= 2;
        if (digit > 9) digit -= 9;
        sum += digit;
    }
    return (sum % 1000).toString().padStart(3,'0');
}