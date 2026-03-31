import type { DbNumeric } from './MultiplierDistribution';
import type { DbTimestamp } from './Batch';

/**
 * Represents a row in `game_rounds`.
 */
export interface GameRound {
    id: string | number; // BIGSERIAL
    round_id: string;
    user_id: string;
    bet_amount: number;
    ticket_no: string | null;
    payout: DbNumeric;  // NUMERIC(12,2)
    profit: DbNumeric;  // NUMERIC(12,2)
    is_win: boolean;
    win_tier: string;
    credited: boolean;
    created_at: DbTimestamp;
}

export type GameRoundInsert =
    Omit<GameRound, 'id' | 'credited' | 'created_at'> &
    Partial<Pick<GameRound, 'id' | 'credited' | 'created_at'>>;

