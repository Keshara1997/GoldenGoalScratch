import type { DbNumeric } from './MultiplierDistribution';
import type { DbTimestamp } from './Batch';

/**
 * Represents a row in `tickets`.
 * Notes:
 * - NUMERIC columns typically come back as strings via `pg` unless you register custom parsers.
 * - Many columns are stored as comma-separated strings per your schema.
 */
export interface Ticket {
    id: string | number; // BIGSERIAL can exceed JS safe int; `pg` returns string unless configured
    ticket_no: string | null;
    bet_amount: number;
    multiplier: DbNumeric;
    hit_count: number; // SMALLINT
    payout: DbNumeric; // NUMERIC(12,2)
    win_tier: string;
    winning_numbers: string;      // "01,02,03,04,05"
    your_numbers: string;         // 20 numbers comma-separated
    printed_amounts: string;      // 20 amounts comma-separated
    hit_positions: string;        // comma-separated indices
    hit_amounts: string;          // comma-separated amounts
    near_miss_positions: string | null;
    near_miss_numbers: string | null;
    batch_id: number | null;
    seq_in_batch: number;
    generated_at: DbTimestamp;
    issued_at: DbTimestamp | null;
    is_issued: boolean;
}

export type TicketInsert =
    Omit<Ticket, 'id' | 'issued_at'> &
    Partial<Pick<Ticket, 'id' | 'issued_at'>>;

