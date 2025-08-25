/**
 * Mock Price Oracle that emits price updates for testing
 */
export class MockPriceOracle {
    private prices: number[];
    private interval: number;
    private currentIndex = 0;
    private intervalId?: NodeJS.Timeout;
    private listeners: Array<(price: number) => void> = [];
    private isRunning = false;

    constructor(prices: number[], interval: number) {
        this.prices = prices;
        this.interval = interval;
    }

    async start() {
        if (this.isRunning) return;

        this.isRunning = true;
        console.log(`[MockPriceOracle] Starting with prices: ${this.prices.join(' -> ')}`);

        this.intervalId = setInterval(() => {
            if (this.currentIndex < this.prices.length) {
                const price = this.prices[this.currentIndex];
                this.emitPrice(price);
                this.currentIndex++;
            } else {
                this.stop();
            }
        }, this.interval);
    }

    async stop() {
        if (!this.isRunning) return;

        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
        console.log('[MockPriceOracle] Stopped');
    }

    emitPrice(price: number) {
        console.log(`[MockPriceOracle] Emitting price: $${price}`);
        this.listeners.forEach(listener => listener(price));
    }

    onPriceUpdate(listener: (price: number) => void) {
        this.listeners.push(listener);
    }

    getCurrentPrice(): number {
        return this.prices[this.currentIndex - 1] || this.prices[0];
    }

    // Method to manually trigger price updates
    setPrice(price: number) {
        this.emitPrice(price);
    }

    // Method to reset the price sequence
    reset() {
        this.currentIndex = 0;
    }

    // Method to add more prices dynamically
    addPrices(newPrices: number[]) {
        this.prices.push(...newPrices);
    }
}
