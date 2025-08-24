import { beforeAll, afterAll } from 'vitest';

// Set test environment before importing anything
process.env.NODE_ENV = 'test';

// Mock the database for unit tests
let testDatabase: any;

beforeAll(async () => {
    try {
        // For unit tests, we don't need a real database
        // The models will be mocked
        console.log('Test setup initialized (unit tests)');
    } catch (error) {
        console.error('Test setup failed:', error);
        throw error;
    }
});

afterAll(async () => {
    if (testDatabase) {
        try {
            await testDatabase.close();
            console.log('Test database closed');
        } catch (error) {
            console.error('Failed to close test database:', error);
        }
    }
});

export { testDatabase };
