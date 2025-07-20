import { Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { getDatabase } from './connection';

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface WhereClause {
  [key: string]: any;
}

export abstract class BaseRepository<T> {
  protected db: Database<sqlite3.Database, sqlite3.Statement>;
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
    this.db = getDatabase();
  }

  /**
   * Find a single record by ID
   */
  async findById(id: string | number): Promise<T | null> {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
      const result = await this.db.get<T>(sql, [id]);
      return result || null;
    } catch (error) {
      console.error(`Error finding ${this.tableName} by ID:`, error);
      throw error;
    }
  }

  /**
   * Find records by criteria
   */
  async findBy(where: WhereClause, options: QueryOptions = {}): Promise<T[]> {
    try {
      const whereClause = this.buildWhereClause(where);
      const orderClause = this.buildOrderClause(options);
      const limitClause = this.buildLimitClause(options);

      const sql = `SELECT * FROM ${this.tableName} ${whereClause} ${orderClause} ${limitClause}`;
      const params = Object.values(where);

      const results = await this.db.all<T[]>(sql, params);
      return results;
    } catch (error) {
      console.error(`Error finding ${this.tableName} records:`, error);
      throw error;
    }
  }

  /**
   * Find a single record by criteria
   */
  async findOneBy(where: WhereClause): Promise<T | null> {
    try {
      const results = await this.findBy(where, { limit: 1 });
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error(`Error finding single ${this.tableName} record:`, error);
      throw error;
    }
  }

  /**
   * Get all records
   */
  async findAll(options: QueryOptions = {}): Promise<T[]> {
    try {
      const orderClause = this.buildOrderClause(options);
      const limitClause = this.buildLimitClause(options);

      const sql = `SELECT * FROM ${this.tableName} ${orderClause} ${limitClause}`;
      const results = await this.db.all<T[]>(sql);
      return results;
    } catch (error) {
      console.error(`Error finding all ${this.tableName} records:`, error);
      throw error;
    }
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>): Promise<T> {
    try {
      const fields = Object.keys(data);
      const values = Object.values(data);
      const placeholders = fields.map(() => '?').join(', ');

      const sql = `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
      const result = await this.db.run(sql, values);

      // For tables with auto-increment integer IDs
      if (result.lastID && !data.hasOwnProperty('id')) {
        return await this.findById(result.lastID) as T;
      } 
      // For tables with string IDs or manually provided IDs
      else if (data.hasOwnProperty('id')) {
        const createdRecord = await this.findById((data as any).id);
        if (!createdRecord) {
          throw new Error('Failed to retrieve created record');
        }
        return createdRecord;
      }
      // Fallback: try to find by unique fields
      else {
        const createdRecord = await this.findOneBy(data as WhereClause);
        if (!createdRecord) {
          throw new Error('Failed to retrieve created record');
        }
        return createdRecord;
      }
    } catch (error) {
      console.error(`Error creating ${this.tableName} record:`, error);
      throw error;
    }
  }

  /**
   * Update a record by ID
   */
  async update(id: string | number, data: Partial<T>): Promise<T | null> {
    try {
      const fields = Object.keys(data);
      const values = Object.values(data);
      const setClause = fields.map(field => `${field} = ?`).join(', ');

      // Check if table has updated_at column by trying to add it
      let sql = `UPDATE ${this.tableName} SET ${setClause}`;
      let params = [...values, id];
      
      // Add updated_at if not already in the data
      if (!data.hasOwnProperty('updated_at')) {
        sql += `, updated_at = CURRENT_TIMESTAMP`;
      }
      
      sql += ` WHERE id = ?`;

      const result = await this.db.run(sql, params);

      if (result.changes && result.changes > 0) {
        return await this.findById(id);
      }
      return null;
    } catch (error) {
      // If updated_at column doesn't exist, try without it
      if (error instanceof Error && error.message && error.message.includes('updated_at')) {
        try {
          const fields = Object.keys(data);
          const values = Object.values(data);
          const setClause = fields.map(field => `${field} = ?`).join(', ');
          const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
          const result = await this.db.run(sql, [...values, id]);

          if (result.changes && result.changes > 0) {
            return await this.findById(id);
          }
          return null;
        } catch (retryError) {
          console.error(`Error updating ${this.tableName} record (retry):`, retryError);
          throw retryError;
        }
      }
      console.error(`Error updating ${this.tableName} record:`, error);
      throw error;
    }
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string | number): Promise<boolean> {
    try {
      const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
      const result = await this.db.run(sql, [id]);
      return result.changes !== undefined && result.changes > 0;
    } catch (error) {
      console.error(`Error deleting ${this.tableName} record:`, error);
      throw error;
    }
  }

  /**
   * Count records
   */
  async count(where?: WhereClause): Promise<number> {
    try {
      let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      let params: any[] = [];

      if (where) {
        const whereClause = this.buildWhereClause(where);
        sql += ` ${whereClause}`;
        params = Object.values(where);
      }

      const result = await this.db.get<{ count: number }>(sql, params);
      return result?.count || 0;
    } catch (error) {
      console.error(`Error counting ${this.tableName} records:`, error);
      throw error;
    }
  }

  /**
   * Check if record exists
   */
  async exists(where: WhereClause): Promise<boolean> {
    try {
      const count = await this.count(where);
      return count > 0;
    } catch (error) {
      console.error(`Error checking ${this.tableName} existence:`, error);
      throw error;
    }
  }

  /**
   * Execute raw SQL query
   */
  async query<R = any>(sql: string, params: any[] = []): Promise<R[]> {
    try {
      return await this.db.all<R[]>(sql, params);
    } catch (error) {
      console.error('Error executing raw query:', error);
      throw error;
    }
  }

  /**
   * Execute raw SQL query for single result
   */
  async queryOne<R = any>(sql: string, params: any[] = []): Promise<R | null> {
    try {
      const result = await this.db.get<R>(sql, params);
      return result || null;
    } catch (error) {
      console.error('Error executing raw query (single):', error);
      throw error;
    }
  }

  /**
   * Begin transaction
   */
  async beginTransaction(): Promise<void> {
    await this.db.exec('BEGIN TRANSACTION');
  }

  /**
   * Commit transaction
   */
  async commitTransaction(): Promise<void> {
    await this.db.exec('COMMIT');
  }

  /**
   * Rollback transaction
   */
  async rollbackTransaction(): Promise<void> {
    await this.db.exec('ROLLBACK');
  }

  // Helper methods
  private buildWhereClause(where: WhereClause): string {
    if (Object.keys(where).length === 0) {
      return '';
    }

    const conditions = Object.keys(where).map(key => `${key} = ?`);
    return `WHERE ${conditions.join(' AND ')}`;
  }

  private buildOrderClause(options: QueryOptions): string {
    if (!options.orderBy) {
      return '';
    }

    const direction = options.orderDirection || 'ASC';
    return `ORDER BY ${options.orderBy} ${direction}`;
  }

  private buildLimitClause(options: QueryOptions): string {
    let clause = '';
    
    if (options.limit) {
      clause += `LIMIT ${options.limit}`;
    }
    
    if (options.offset) {
      clause += ` OFFSET ${options.offset}`;
    }
    
    return clause;
  }
}