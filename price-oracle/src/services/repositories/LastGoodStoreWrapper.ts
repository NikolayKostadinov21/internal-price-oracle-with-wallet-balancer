import { DatabaseLastGoodStore } from './DatabaseLastGoodStore';
import { LastGoodStore, ConsolidatedPrice } from '../../types';

export class LastGoodStoreWrapper implements LastGoodStore {
  constructor(private dbLastGoodStore: DatabaseLastGoodStore) {}

  async getLastGood(token: string): Promise<ConsolidatedPrice | null> {
    return this.dbLastGoodStore.getLastGood(token);
  }

  async putLastGood(token: string, price: ConsolidatedPrice): Promise<void> {
    return this.dbLastGoodStore.putLastGood(token, price);
  }

  // Additional methods from DatabaseLastGoodStore
  async getAllLastGoodPrices() {
    return this.dbLastGoodStore.getAllLastGoodPrices();
  }

  async clearLastGoodPrice(token: string) {
    return this.dbLastGoodStore.clearLastGoodPrice(token);
  }

  async clearAllLastGoodPrices() {
    return this.dbLastGoodStore.clearAllLastGoodPrices();
  }

  async getLastGoodPriceAge(token: string) {
    return this.dbLastGoodStore.getLastGoodPriceAge(token);
  }
}
