// import crypto from 'crypto';

// /** Secure random integer [min,max] inclusive */
// export function randomInt(min: number, max: number): number {
//     const range = max - min + 1;
//     const rand = crypto.randomBytes(4).readUInt32BE(0);
//     return min + (rand % range);
// }

// /** Weighted random selection */
// export function weightedRandom<T>(items: T[], weights: number[]): T {
//     const total = weights.reduce((s, w) => s + w, 0);
//     let r = randomInt(0, Math.floor(total * 1e6)) / 1e6;
//     let idx = 0;
//     for (; idx < items.length; idx++) {
//         r -= weights[idx];
//         if (r <= 0) break;
//     }
//     return items[idx];
// }

// /** Shuffle array (Fisher-Yates) */
// export function shuffle<T>(arr: T[]): T[] {
//     const a = [...arr];
//     for (let i = a.length - 1; i > 0; i--) {
//         const j = randomInt(0, i);
//         [a[i], a[j]] = [a[j], a[i]];
//     }
//     return a;
// }

// /** Generate random distinct numbers from 0..max-1 */
// export function distinctNumbers(count: number, max: number): number[] {
//     const all = Array.from({ length: max }, (_, i) => i);
//     // console.log('01. distinctNumbers', count, max, all);
//     const result = shuffle(all).slice(0, count);
//     // console.log('02. result', result);
//     return result;
// }


import crypto from 'crypto';

/**
 * Generate a secure random integer between min and max (inclusive).
 * Uses Node.js crypto for cryptographically secure randomness.
 * 
 * @param min - Minimum integer value (inclusive)
 * @param max - Maximum integer value (inclusive)
 * @returns A random integer in the range [min, max]
 */
export function randomInt(min: number, max: number): number {
    const range = max - min + 1; // Total number of possible integers
    // Generate 4 random bytes and interpret as a 32-bit unsigned integer
    const rand = crypto.randomBytes(4).readUInt32BE(0);
    // Return a number in the range [min, max]
    return min + (rand % range);
}

/**
 * Select an item from an array based on weighted probabilities.
 * 
 * @param items - Array of items to choose from
 * @param weights - Array of weights corresponding to items (same length)
 * @returns A single item from the items array, chosen according to weights
 * 
 * Example:
 * weightedRandom(['A','B','C'], [10, 20, 70]) 
 *  - 'A' has 10% chance, 'B' 20%, 'C' 70%.
 */
export function weightedRandom<T>(items: T[], weights: number[]): T {
    const total = weights.reduce((s, w) => s + w, 0); // Sum of all weights
    // Generate a random float in range [0, total)
    let r = randomInt(0, Math.floor(total * 1e6)) / 1e6;
    let idx = 0;
    // Iterate through weights subtracting each from r until r <= 0
    for (; idx < items.length; idx++) {
        r -= weights[idx];
        if (r <= 0) break;
    }
    return items[idx]; // Return the selected item
}

/**
 * Shuffle an array using the Fisher-Yates algorithm.
 * 
 * @param arr - Array to shuffle
 * @returns A new array with elements randomly shuffled
 * 
 * Example:
 * shuffle([1,2,3,4]) => [3,1,4,2]
 */
export function  shuffle<T>(arr: T[]): T[] {
    const a = [...arr]; // Create a copy to avoid mutating the original array
    for (let i = a.length - 1; i > 0; i--) {
        const j = randomInt(0, i); // Pick a random index 0..i
        [a[i], a[j]] = [a[j], a[i]]; // Swap elements
    }
    return a;
}

/**
 * Generate an array of distinct random integers in range [0, max-1].
 * 
 * @param count - Number of distinct integers to generate
 * @param max - Upper bound (exclusive) of integers (0..max-1)
 * @returns Array of length `count` containing distinct random integers
 * 
 * Example:
 * distinctNumbers(3, 10) => [0, 7, 3] (order may vary)
 */
export function distinctNumbers(count: number, max: number): number[] {
    // Create an array of all numbers 0..max-1
    const all = Array.from({ length: max }, (_, i) => i);
    // Shuffle the array
    const result = shuffle(all).slice(0, count); // Take first `count` elements
    return result;
}