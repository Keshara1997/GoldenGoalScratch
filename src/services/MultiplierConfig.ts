// interface HitPattern {
//     amounts: number[];   // amounts as multiples of bet
//     count: number;       // number of tickets for this pattern in a batch of 10M
// }

// interface MultiplierInfo {
//     multiplier: number;
//     probability?: number; // optional, can be derived from counts
//     patterns: HitPattern[];
// }

// export const multiplierConfigs: Record<number, MultiplierInfo[]> = {
//     10: [
//         {
//             multiplier: 0,
//             patterns: [{ amounts: [], count: 7065750 }]
//         },
//         {
//             multiplier: 1.5,
//             patterns: [{ amounts: [1.5], count: 1143530 }]
//         },
//         {
//             multiplier: 2,
//             patterns: [{ amounts: [2], count: 428830 }]
//         },
//         {
//             multiplier: 2.5,
//             patterns: [{ amounts: [2.5], count: 285890 }]
//         },
//         {
//             multiplier: 3,
//             patterns: [
//                 { amounts: [1.5, 1.5], count: 57178 },
//                 { amounts: [3], count: 228712 }
//             ]
//         },
//         {
//             multiplier: 4,
//             patterns: [
//                 { amounts: [1.5, 2.5], count: 25714 },
//                 { amounts: [2, 2], count: 51428 },
//                 { amounts: [4], count: 179998 }
//             ]
//         },
//         {
//             multiplier: 5,
//             patterns: [
//                 { amounts: [1.5, 1.5, 2], count: 20012 },
//                 { amounts: [2.5, 2.5], count: 20012 },
//                 { amounts: [2, 3], count: 40024 },
//                 { amounts: [5], count: 120072 }
//             ]
//         },
//         {
//             multiplier: 6,
//             patterns: [
//                 { amounts: [2, 1.5, 2.5], count: 14310 },
//                 { amounts: [2, 2, 2], count: 14310 },
//                 { amounts: [4, 2], count: 14310 },
//                 { amounts: [3, 3], count: 28620 },
//                 { amounts: [6], count: 71550 }
//             ]
//         },
//         {
//             multiplier: 8,
//             patterns: [
//                 { amounts: [4, 2.5, 1.5], count: 8577 },
//                 { amounts: [5, 3], count: 8577 },
//                 { amounts: [6, 2], count: 12866 },
//                 { amounts: [4, 4], count: 12866 },
//                 { amounts: [8], count: 42885 }
//             ]
//         },
//         {
//             multiplier: 10,
//             patterns: [
//                 { amounts: [6, 2.5, 1.5], count: 1906 },
//                 { amounts: [4, 3, 3], count: 1906 },
//                 { amounts: [6, 4], count: 3812 },
//                 { amounts: [8, 2], count: 3812 },
//                 { amounts: [5, 5], count: 5718 },
//                 { amounts: [10], count: 20966 }
//             ]
//         },
//         {
//             multiplier: 12,
//             patterns: [
//                 { amounts: [6, 4, 2], count: 953 },
//                 { amounts: [5, 4, 3], count: 953 },
//                 { amounts: [10, 2], count: 953 },
//                 { amounts: [8, 4], count: 1906 },
//                 { amounts: [6, 6], count: 2859 },
//                 { amounts: [12], count: 11436 }
//             ]
//         },
//         {
//             multiplier: 15,
//             patterns: [
//                 { amounts: [4, 4, 4, 3], count: 715 },
//                 { amounts: [8, 4, 3], count: 715 },
//                 { amounts: [12, 3], count: 1430 },
//                 { amounts: [10, 5], count: 2145 },
//                 { amounts: [15], count: 9295 }
//             ]
//         },
//         {
//             multiplier: 20,
//             patterns: [
//                 { amounts: [10, 6, 4], count: 229 },
//                 { amounts: [8, 6, 6], count: 343 },
//                 { amounts: [12, 8], count: 801 },
//                 { amounts: [15, 5], count: 915 },
//                 { amounts: [10, 10], count: 1144 },
//                 { amounts: [20], count: 8008 }
//             ]
//         },
//         {
//             multiplier: 25,
//             patterns: [
//                 { amounts: [10, 5, 5, 5], count: 228 },
//                 { amounts: [12, 8, 5], count: 305 },
//                 { amounts: [15, 10], count: 610 },
//                 { amounts: [20, 5], count: 762 },
//                 { amounts: [25], count: 5715 }
//             ]
//         },
//         {
//             multiplier: 30,
//             patterns: [
//                 { amounts: [10, 10, 5, 5], count: 114 },
//                 { amounts: [12, 10, 8], count: 172 },
//                 { amounts: [15, 15], count: 400 },
//                 { amounts: [20, 10], count: 572 },
//                 { amounts: [30], count: 4462 }
//             ]
//         },
//         {
//             multiplier: 40,
//             patterns: [
//                 { amounts: [12, 8, 10, 10], count: 76 },
//                 { amounts: [25, 15], count: 114 },
//                 { amounts: [30, 10], count: 191 },
//                 { amounts: [20, 20], count: 305 },
//                 { amounts: [40], count: 3124 }
//             ]
//         },
//         {
//             multiplier: 50,
//             patterns: [
//                 { amounts: [20, 12, 10, 8], count: 28 },
//                 { amounts: [20, 15, 15], count: 29 },
//                 { amounts: [25, 25], count: 86 },
//                 { amounts: [40, 10], count: 114 },
//                 { amounts: [30, 20], count: 172 },
//                 { amounts: [50], count: 2431 }
//             ]
//         },
//         {
//             multiplier: 200,
//             patterns: [
//                 { amounts: [50, 50, 50, 50], count: 48 },
//                 { amounts: [200], count: 902 }
//             ]
//         },
//         {
//             multiplier: 800,
//             patterns: [
//                 { amounts: [200, 200, 200, 200], count: 5 },
//                 { amounts: [800], count: 95 }
//             ]
//         }
//     ]
// };


export type MultiplierInfo = {
    multiplier: number;
    patterns: { amounts: number[]; count: number }[];
};

/**
 * Bet amounts that use the multiplier distribution (same relative frequencies for each tier).
 * Keep in sync with `BET_TIERS` in TicketGenerator.
 */
export const MULTIPLIER_CONFIG_BET_AMOUNTS = [
    1, 2, 4, 8, 10, 20, 40, 80, 100, 200, 400, 800, 1000,
] as const;

export type BetAmount = (typeof MULTIPLIER_CONFIG_BET_AMOUNTS)[number];

const SUPPORTED_BETS = new Set<number>(MULTIPLIER_CONFIG_BET_AMOUNTS);

/**
 * Single canonical distribution (pattern counts are identical per bet tier in this model).
 */
const DEFAULT_MULTIPLIER_CONFIG: MultiplierInfo[] =

    [
        {
            multiplier: 0,
            patterns: [{ amounts: [], count: 7065750 }]
        },
        {
            multiplier: 1.5,
            patterns: [{ amounts: [1.5], count: 1143530 }]
        },
        {
            multiplier: 2,
            patterns: [{ amounts: [2], count: 428830 }]
        },
        {
            multiplier: 2.5,
            patterns: [{ amounts: [2.5], count: 285890 }]
        },
        {
            multiplier: 3,
            patterns: [
                { amounts: [1.5, 1.5], count: 57178 },
                { amounts: [3], count: 228712 }
            ]
        },
        {
            multiplier: 4,
            patterns: [
                { amounts: [1.5, 2.5], count: 25714 },
                { amounts: [2, 2], count: 51428 },
                { amounts: [4], count: 179998 }
            ]
        },
        {
            multiplier: 5,
            patterns: [
                { amounts: [1.5, 1.5, 2], count: 20012 },
                { amounts: [2.5, 2.5], count: 20012 },
                { amounts: [2, 3], count: 40024 },
                { amounts: [5], count: 120072 }
            ]
        },
        {
            multiplier: 6,
            patterns: [
                { amounts: [2, 1.5, 2.5], count: 14310 },
                { amounts: [2, 2, 2], count: 14310 },
                { amounts: [4, 2], count: 14310 },
                { amounts: [3, 3], count: 28620 },
                { amounts: [6], count: 71550 }
            ]
        },
        {
            multiplier: 8,
            patterns: [
                { amounts: [4, 2.5, 1.5], count: 8577 },
                { amounts: [5, 3], count: 8577 },
                { amounts: [6, 2], count: 12866 },
                { amounts: [4, 4], count: 12866 },
                { amounts: [8], count: 42885 }
            ]
        },
        {
            multiplier: 10,
            patterns: [
                { amounts: [6, 2.5, 1.5], count: 1906 },
                { amounts: [4, 3, 3], count: 1906 },
                { amounts: [6, 4], count: 3812 },
                { amounts: [8, 2], count: 3812 },
                { amounts: [5, 5], count: 5718 },
                { amounts: [10], count: 20966 }
            ]
        },
        {
            multiplier: 12,
            patterns: [
                { amounts: [6, 3.5, 2.5], count: 953 },
                { amounts: [5, 4, 3], count: 953 },
                { amounts: [10, 2], count: 953 },
                { amounts: [8, 4], count: 1906 },
                { amounts: [6, 6], count: 2859 },
                { amounts: [12], count: 11436 }
            ]
        },
        {
            multiplier: 15,
            patterns: [
                { amounts: [4, 4, 4, 3], count: 715 },
                { amounts: [8, 4, 3], count: 715 },
                { amounts: [12, 3], count: 1430 },
                { amounts: [10, 5], count: 2145 },
                { amounts: [15], count: 9295 }
            ]
        },
        {
            multiplier: 20,
            patterns: [
                { amounts: [10, 6, 4], count: 229 },
                { amounts: [8, 6, 6], count: 343 },
                { amounts: [12, 8], count: 801 },
                { amounts: [15, 5], count: 915 },
                { amounts: [10, 10], count: 1144 },
                { amounts: [20], count: 8008 }
            ]
        },
        {
            multiplier: 25,
            patterns: [
                { amounts: [10, 5, 5, 5], count: 228 },
                { amounts: [12, 8, 5], count: 305 },
                { amounts: [15, 10], count: 610 },
                { amounts: [20, 5], count: 762 },
                { amounts: [25], count: 5715 }
            ]
        },
        {
            multiplier: 30,
            patterns: [
                { amounts: [10, 10, 5, 5], count: 114 },
                { amounts: [12, 10, 8], count: 172 },
                { amounts: [15, 15], count: 400 },
                { amounts: [20, 10], count: 572 },
                { amounts: [30], count: 4462 }
            ]
        },
        {
            multiplier: 40,
            patterns: [
                { amounts: [12, 8, 10, 10], count: 76 },
                { amounts: [25, 15], count: 114 },
                { amounts: [30, 10], count: 191 },
                { amounts: [20, 20], count: 305 },
                { amounts: [40], count: 3124 }
            ]
        },
        {
            multiplier: 50,
            patterns: [
                { amounts: [20, 12, 10, 8], count: 28 },
                { amounts: [20, 15, 15], count: 29 },
                { amounts: [25, 25], count: 86 },
                { amounts: [40, 10], count: 114 },
                { amounts: [30, 20], count: 172 },
                { amounts: [50], count: 2431 }
            ]
        },
        {
            multiplier: 200,
            patterns: [
                { amounts: [50, 50, 50, 50], count: 48 },
                { amounts: [200], count: 902 }
            ]
        },
        {
            multiplier: 800,
            patterns: [
                { amounts: [200, 200, 200, 200], count: 5 },
                { amounts: [800], count: 95 }
            ]
        }
    ];



//     [
//     { multiplier: 0, patterns: [{ amounts: [] as number[], count: 7066 }] },

//     { multiplier: 1.5, patterns: [{ amounts: [1.5], count: 1144 }] },

//     { multiplier: 2, patterns: [{ amounts: [2], count: 429 }] },

//     { multiplier: 2.5, patterns: [{ amounts: [2.5], count: 286 }] },

//     {
//         multiplier: 3,
//         patterns: [
//             { amounts: [1.5, 1.5], count: 57 },
//             { amounts: [3], count: 229 },
//         ],
//     },

//     {
//         multiplier: 4,
//         patterns: [
//             { amounts: [1.5, 2.5], count: 26 },
//             { amounts: [2, 2], count: 51 },
//             { amounts: [4], count: 180 },
//         ],
//     },

//     {
//         multiplier: 5,
//         patterns: [
//             { amounts: [1.5, 1.5, 2], count: 20 },
//             { amounts: [2.5, 2.5], count: 20 },
//             { amounts: [2, 3], count: 40 },
//             { amounts: [5], count: 120 },
//         ],
//     },

//     {
//         multiplier: 6,
//         patterns: [
//             { amounts: [2, 1.5, 2.5], count: 14 },
//             { amounts: [2, 2, 2], count: 14 },
//             { amounts: [4, 2], count: 14 },
//             { amounts: [3, 3], count: 29 },
//             { amounts: [6], count: 72 },
//         ],
//     },

//     {
//         multiplier: 8,
//         patterns: [
//             { amounts: [4, 2.5, 1.5], count: 9 },
//             { amounts: [5, 3], count: 9 },
//             { amounts: [6, 2], count: 13 },
//             { amounts: [4, 4], count: 13 },
//             { amounts: [8], count: 43 },
//         ],
//     },

//     {
//         multiplier: 10,
//         patterns: [
//             { amounts: [6, 2.5, 1.5], count: 2 },
//             { amounts: [4, 3, 3], count: 2 },
//             { amounts: [6, 4], count: 4 },
//             { amounts: [8, 2], count: 4 },
//             { amounts: [5, 5], count: 6 },
//             { amounts: [10], count: 21 },
//         ],
//     },

//     {
//         multiplier: 12,
//         patterns: [
//             { amounts: [6, 4, 2], count: 1 },
//             { amounts: [5, 4, 3], count: 1 },
//             { amounts: [10, 2], count: 1 },
//             { amounts: [8, 4], count: 2 },
//             { amounts: [6, 6], count: 3 },
//             { amounts: [12], count: 11 },
//         ],
//     },

//     {
//         multiplier: 15,
//         patterns: [
//             { amounts: [4, 4, 4, 3], count: 1 },
//             { amounts: [8, 4, 3], count: 1 },
//             { amounts: [12, 3], count: 1 },
//             { amounts: [10, 5], count: 2 },
//             { amounts: [15], count: 9 },
//         ],
//     },

//     {
//         multiplier: 20,
//         patterns: [
//             { amounts: [10, 6, 4], count: 0 },
//             { amounts: [8, 6, 6], count: 0 },
//             { amounts: [12, 8], count: 1 },
//             { amounts: [15, 5], count: 1 },
//             { amounts: [10, 10], count: 1 },
//             { amounts: [20], count: 8 },
//         ],
//     },

//     {
//         multiplier: 25,
//         patterns: [
//             { amounts: [10, 5, 5, 5], count: 0 },
//             { amounts: [12, 8, 5], count: 0 },
//             { amounts: [15, 10], count: 1 },
//             { amounts: [20, 5], count: 1 },
//             { amounts: [25], count: 6 },
//         ],
//     },

//     {
//         multiplier: 30,
//         patterns: [
//             { amounts: [10, 10, 5, 5], count: 0 },
//             { amounts: [12, 10, 8], count: 0 },
//             { amounts: [15, 15], count: 0 },
//             { amounts: [20, 10], count: 1 },
//             { amounts: [30], count: 4 },
//         ],
//     },

//     {
//         multiplier: 40,
//         patterns: [
//             { amounts: [12, 8, 10, 10], count: 0 },
//             { amounts: [25, 15], count: 0 },
//             { amounts: [30, 10], count: 0 },
//             { amounts: [20, 20], count: 0 },
//             { amounts: [40], count: 3 },
//         ],
//     },

//     {
//         multiplier: 50,
//         patterns: [
//             { amounts: [20, 12, 10, 8], count: 0 },
//             { amounts: [20, 15, 15], count: 0 },
//             { amounts: [25, 25], count: 0 },
//             { amounts: [40, 10], count: 0 },
//             { amounts: [30, 20], count: 0 },
//             { amounts: [50], count: 2 },
//         ],
//     },

//     {
//         multiplier: 200,
//         patterns: [
//             { amounts: [50, 50, 50, 50], count: 0 },
//             { amounts: [200], count: 1 },
//         ],
//     },

//     {
//         multiplier: 800,
//         patterns: [
//             { amounts: [200, 200, 200, 200], count: 0 },
//             { amounts: [800], count: 0 },
//         ],
//     },
// ];

/**
 * Returns multiplier/pattern rows for a given bet amount (bet “type” in the product sense).
 */
export function getMultiplierConfigsForBet(betAmount: number): MultiplierInfo[] {
    if (!SUPPORTED_BETS.has(betAmount)) {
        throw new Error(`No multiplier config for bet amount: ${betAmount}`);
    }
    return multiplierConfigs[betAmount];
}

/** Lookup table: each supported bet amount maps to the same distribution instance. */
export const multiplierConfigs: Record<number, MultiplierInfo[]> = Object.fromEntries(
    MULTIPLIER_CONFIG_BET_AMOUNTS.map((bet) => [bet, DEFAULT_MULTIPLIER_CONFIG]),
) as Record<number, MultiplierInfo[]>;
