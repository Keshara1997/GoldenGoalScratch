import pool from '../config/database';
import casinoApi from '../services/CasinoApi'; // external

export async function creditRound(roundId: string, userId: string): Promise<boolean> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const res = await client.query(`
            SELECT * FROM game_rounds WHERE round_id = $1 AND user_id = $2 AND credited = FALSE
        `, [roundId, userId]);
        if (res.rows.length === 0) {
            await client.query('ROLLBACK');
            return false;
        }
        const round = res.rows[0];
        // Call casino API to credit
        const credited = await casinoApi.credit(userId, round.payout);
        if (!credited) {
            await client.query('ROLLBACK');
            return false;
        }
        await client.query(`
            UPDATE game_rounds SET credited = TRUE WHERE round_id = $1
        `, [roundId]);
        await client.query('COMMIT');
        return true;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}