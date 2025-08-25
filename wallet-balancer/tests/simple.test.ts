import { describe, it, expect } from 'vitest';

describe('Simple Test', () => {
    it('should work', () => {
        expect(1 + 1).toBe(2);
    });

    it('should handle async', async () => {
        const result = await Promise.resolve(42);
        expect(result).toBe(42);
    });
});
