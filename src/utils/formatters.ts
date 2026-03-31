/** Format number to two‑digit string with leading zero */
export function pad2(num: number): string {
    return num.toString().padStart(2, '0');
}

/** Convert array to comma‑separated string */
export function joinArray(arr: any[]): string {
    return arr.join(',');
}

/** Parse comma‑separated string to array of numbers */
export function parseNumbers(str: string): number[] {
    return str.split(',').map(Number);
}

/** Parse string array to number array (for strings) */
export function parseStringArray(str: string): string[] {
    return str.split(',');
}