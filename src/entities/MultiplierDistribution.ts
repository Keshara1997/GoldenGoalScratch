export type DbNumeric = string;

/**
 * JSONB `hit_patterns` in `multiplier_distribution`.
 * Example in schema: [[1.5,1.5],[3]]
 */
export type HitPatternsJson = number[][];

/**
 * Represents a row in `multiplier_distribution`.
 * Composite PK: (bet_amount, multiplier)
 */
export interface MultiplierDistribution {
    bet_amount: number;
    multiplier: DbNumeric;     // NUMERIC(10,4) -> returned as string by `pg` by default
    probability: DbNumeric;    // NUMERIC(10,6) -> string
    hit_count: number;         // SMALLINT
    hit_patterns: HitPatternsJson;
}
