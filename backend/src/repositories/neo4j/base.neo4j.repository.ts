import { Driver, Session, Record as Neo4jRecord, Integer } from 'neo4j-driver';
import { dbManager } from '../../config/database.js';

export class BaseNeo4jRepository {
  protected driver: Driver;

  constructor(driver?: Driver) {
    this.driver = driver || dbManager.getNeo4jDriver();
  }

  protected async withSession<T>(operation: (session: Session) => Promise<T>): Promise<T> {
    const session = this.driver.session();
    try {
      return await operation(session);
    } finally {
      await session.close().catch(() => {});
    }
  }

  protected async runQuery(query: string, params: Record<string, any> = {}): Promise<Neo4jRecord[]> {
    return this.withSession(async (session) => {
      const result = await session.run(query, params);
      return result.records;
    });
  }

  protected toNativeValue(val: any): any {
    if (val === null || val === undefined) return val;
    if (typeof val === 'object' && 'low' in val && 'high' in val) {
      // Neo4j Integer
      return (val as Integer).toNumber();
    }
    if (Array.isArray(val)) {
      return val.map((item) => this.toNativeValue(item));
    }
    if (typeof val === 'object' && val.properties) {
      // Neo4j Node or Relationship
      const res: Record<string, any> = {};
      for (const [k, v] of Object.entries(val.properties)) {
        res[k] = this.toNativeValue(v);
      }
      return res;
    }
    if (typeof val === 'object') {
      const res: Record<string, any> = {};
      for (const [k, v] of Object.entries(val)) {
        res[k] = this.toNativeValue(v);
      }
      return res;
    }
    return val;
  }
}
