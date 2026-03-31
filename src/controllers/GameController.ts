import { Request, Response } from 'express';
import { issueTicket } from '../services/TicketIssuer';
import casinoApi from '../services/CasinoApi';
import { creditRound } from '../services/GameRoundService';
import pool from '../config/database';

export async function startRound(req: Request, res: Response) {
    const { bet, userId } = req.body;
    const validBets = [1,2,4,8,10,20,40,80,100,200,400,800,1000];
    if (!validBets.includes(bet)) {
        return res.status(400).json({ error: 'Invalid bet amount' });
    }
    // Debit first
    const debitOk = await casinoApi.debit(userId, bet);
    if (!debitOk) {
        return res.status(400).json({ error: 'Debit failed' });
    }
    // Issue ticket
    let result;
    try {
        result = await issueTicket(bet, userId);
    } catch (err) {
        // make-good credit back
        await casinoApi.credit(userId, bet);
        return res.status(500).json({ error: 'System busy, please try again' });
    }
    if (!result) {
        // no ticket available, refund
        await casinoApi.credit(userId, bet);
        return res.status(503).json({ error: 'Game busy, please try later' });
    }
    const { ticket, roundId, ticketNo } = result;
    // Build scratch card for client
    const scratchCard = ticket.your_numbers.split(',').map((num: string, idx: number) => ({
        number: num,
        amount: parseFloat(ticket.printed_amounts.split(',')[idx]),
        isHit: ticket.hit_positions.split(',').map(Number).includes(idx),
        isNearMiss: ticket.near_miss_positions ? ticket.near_miss_positions.split(',').map(Number).includes(idx) : false,
        state: 'COVERED'
    }));
    res.json({
        roundId,
        ticketNo,
        payout: ticket.payout,
        winTier: ticket.win_tier,
        scratchCard,
        winningNumbers: ticket.winning_numbers.split(',')
    });
}

export async function revealAll(req: Request, res: Response) {
    const { roundId, userId } = req.body;
    // Optionally credit if not already credited
    const credited = await creditRound(roundId, userId);
    if (!credited) {
        // round not found or already credited
        return res.status(404).json({ error: 'Round not found or already credited' });
    }
    // Could fetch round info from DB to return payout
    const roundRes = await pool.query('SELECT payout, win_tier FROM game_rounds WHERE round_id = $1', [roundId]);
    if (roundRes.rows.length === 0) return res.status(404).json({ error: 'Round not found' });
    const { payout, win_tier } = roundRes.rows[0];
    res.json({ payout, winTier: win_tier, profit: payout  });
}