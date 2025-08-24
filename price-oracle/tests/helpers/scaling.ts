export function toScaledBigInt(decimal: string, decimals: number): bigint {
    const [intPart, fracPartRaw = ''] = decimal.split('.');

    // Handle edge cases
    if (decimals < 0) throw new Error('Decimals must be non-negative');
    if (decimals > 1000) throw new Error('Decimals too large'); // Reasonable limit

    const fracPart = fracPartRaw.padEnd(decimals, '0').slice(0, decimals);
    const combined = intPart + fracPart;

    // Validate the combined string
    if (combined.length > 1000) throw new Error('Number too large');

    return BigInt(combined);
}

export function fromScaledBigInt(value: bigint, decimals: number): string {
    if (decimals < 0) throw new Error('Decimals must be non-negative');
    if (decimals > 1000) throw new Error('Decimals too large');

    const str = value.toString();
    if (decimals === 0) return str;

    if (str.length <= decimals) {
        return `0.${str.padStart(decimals, '0')}`;
    }

    const intPart = str.slice(0, str.length - decimals);
    const fracPart = str.slice(str.length - decimals);
    return `${intPart}.${fracPart}`;
}
