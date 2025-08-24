// Custom Vitest type declarations for IDE support
declare module 'vitest' {
    export function describe(name: string, fn: () => void): void;
    export function it(name: string, fn: () => void | Promise<void>): void;
    export function test(name: string, fn: () => void | Promise<void>): void;
    export function beforeEach(fn: () => void | Promise<void>): void;
    export function afterEach(fn: () => void | Promise<void>): void;
    export function beforeAll(fn: () => void | Promise<void>): void;
    export function afterAll(fn: () => void | Promise<void>): void;

    export interface ExpectStatic {
        <T>(actual: T): Assertion<T>;
    }

    export interface Assertion<T> {
        toBe(expected: T): void;
        toEqual(expected: T): void;
        toHaveLength(expected: number): void;
        toThrow(): void;
        toThrow(expected: string | RegExp | Error): void;
        toBeInstanceOf(expected: any): void;
        toBeTruthy(): void;
        toBeFalsy(): void;
        toBeNull(): void;
        toBeUndefined(): void;
        toBeDefined(): void;
        toContain(expected: any): void;
        toMatchObject(expected: any): void;
    }

    export const expect: ExpectStatic;
}

// Global declarations for when using globals: true
declare global {
    const describe: typeof import('vitest').describe;
    const it: typeof import('vitest').it;
    const test: typeof import('vitest').test;
    const expect: typeof import('vitest').expect;
    const beforeEach: typeof import('vitest').beforeEach;
    const afterEach: typeof import('vitest').afterEach;
    const beforeAll: typeof import('vitest').beforeAll;
    const afterAll: typeof import('vitest').afterAll;
}
