import { generateBatch } from '../services/TicketGenerator';
import pool from '../config/database';
import { BET_TIERS, MAX_TICKET_COUNT, MIN_TICKET_COUNT } from '../services/TicketGenerator';

// Check inventory levels periodically (e.g., every 5 minutes)
export async function checkAndReplenish() {
    for (const bet of BET_TIERS) {
        const res = await pool.query(`
            SELECT COUNT(*) FROM tickets WHERE bet_amount = $1 AND is_issued = FALSE
        `, [bet]);
        const available = parseInt(res.rows[0].count);
        if (available < MIN_TICKET_COUNT) {
            console.log(`Replenishing bet ${bet} (available: ${available})`);
            // Start generation asynchronously (could use Bull queue)
            generateBatch(bet, MAX_TICKET_COUNT).catch(console.error);
        }
    }
}