import { LastGoodStoreModel, LastGoodStoreAttributes } from '../../models/LastGoodStore';
import { LastGoodStore, ConsolidatedPrice, OracleSource } from '../../types';

export class DatabaseLastGoodStore implements LastGoodStore {
  constructor(private sequelize: any) { }

  async getLastGood(token: string): Promise<ConsolidatedPrice | null> {
    try {
      const record = await LastGoodStoreModel.findOne({
        where: { token: token.toUpperCase() }
      });

      if (!record) {
        return null;
      }

      // Extract data from Sequelize model
      const recordData = record.get();
      return this.mapToPriceData(recordData);
    } catch (error) {
      console.error(`[DatabaseLastGoodStore] Failed to get last good price for ${token}:`, error);
      return null;
    }
  }

  async putLastGood(token: string, priceData: ConsolidatedPrice): Promise<void> {
    try {
      const [record, created] = await LastGoodStoreModel.findOrCreate({
        where: { token: token.toUpperCase() },
        defaults: {
          token: token.toUpperCase(),
          price: priceData.price.toString(),
          priceDecimals: priceData.priceDecimals,
          at: priceData.at,
          source: priceData.source,
        }
      });

      if (!created) {
        // Update existing record
        await record.update({
          price: priceData.price.toString(),
          priceDecimals: priceData.priceDecimals,
          at: priceData.at,
          source: priceData.source,
        });
      }

      console.log(`[DatabaseLastGoodStore] ${created ? 'Created' : 'Updated'} last good price for ${token}`);
    } catch (error) {
      console.error(`[DatabaseLastGoodStore] Failed to set last good price for ${token}:`, error);
      throw error;
    }
  }

  async getAllLastGoodPrices(): Promise<Map<string, ConsolidatedPrice>> {
    try {
      const records = await LastGoodStoreModel.findAll();
      const priceMap = new Map<string, ConsolidatedPrice>();

      for (const record of records) {
        const recordData = record.get();
        priceMap.set(recordData.token, this.mapToPriceData(recordData));
      }

      return priceMap;
    } catch (error) {
      console.error('[DatabaseLastGoodStore] Failed to get all last good prices:', error);
      return new Map();
    }
  }

  async clearLastGoodPrice(token: string): Promise<void> {
    try {
      const result = await LastGoodStoreModel.destroy({
        where: { token: token.toUpperCase() }
      });

      if (result === 0) {
        console.log(`[DatabaseLastGoodStore] No last good price found for ${token} to clear`);
        return;
      }

      console.log(`[DatabaseLastGoodStore] Cleared last good price for ${token}`);
    } catch (error) {
      console.error(`[DatabaseLastGoodStore] Failed to clear last good price for ${token}:`, error);
      throw error;
    }
  }

  async clearAllLastGoodPrices(): Promise<void> {
    try {
      await LastGoodStoreModel.destroy({ truncate: true });
      console.log('[DatabaseLastGoodStore] Cleared all last good prices');
    } catch (error) {
      console.error('[DatabaseLastGoodStore] Failed to clear all last good prices:', error);
      throw error;
    }
  }

  async getLastGoodPriceAge(token: string): Promise<number | null> {
    try {
      const record = await LastGoodStoreModel.findOne({
        where: { token: token.toUpperCase() }
      });

      if (!record) {
        return null;
      }

      const recordData = record.get();
      const now = Math.floor(Date.now() / 1000);
      return now - recordData.at;
    } catch (error) {
      console.error(`[DatabaseLastGoodStore] Failed to get last good price age for ${token}:`, error);
      return null;
    }
  }

  private mapToPriceData(dbRecord: LastGoodStoreAttributes): ConsolidatedPrice {
    return {
      source: 'nexo' as const,
      price: BigInt(dbRecord.price),
      priceDecimals: dbRecord.priceDecimals,
      at: dbRecord.at,
      mode: 'normal',
      timestamp: dbRecord.createdAt?.getTime() || Date.now(),
      lastUpdated: dbRecord.updatedAt?.getTime() || Date.now(),
      volume24h: undefined,
      sourcesUsed: [{
        source: dbRecord.source as OracleSource,
        price: BigInt(dbRecord.price),
        priceDecimals: dbRecord.priceDecimals,
        at: dbRecord.at,
      }]
    };
  }
}
