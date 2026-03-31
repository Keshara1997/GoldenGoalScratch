export type DbTimestamp = Date | string;

/**
 * Represents a row in `batches`.
 * Field names are snake_case to match `pg` row objects.
 */
export interface Batch {
    id: number;
    bet_amount: number;
    ticket_count: number;
    generated_at: DbTimestamp;
}

export type BatchInsert = Omit<Batch, 'id' | 'generated_at'> & Partial<Pick<Batch, 'generated_at'>>;
