import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;
  private readonly logger = new Logger(DatabaseService.name);

  constructor(connectionString: string, ssl = false) {
    this.pool = new Pool({ connectionString, ssl });
    this.pool.on("error", (error: Error) => {
      this.logger.error(`Idle PostgreSQL connection failed: ${error.message}`, error.stack);
    });
  }

  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: Array<string | number | boolean | Date | string[] | null>,
  ): Promise<QueryResult<Row>> {
    return this.pool.query<Row>(text, values);
  }

  async transaction<Result>(
    operation: (client: PoolClient) => Promise<Result>,
  ): Promise<Result> {
    const client = await this.pool.connect();
    let connectionError: Error | undefined;
    let discardError: Error | undefined;
    // Pool's error listener covers idle clients only. A checked-out client can
    // emit an error while the transaction callback is between queries.
    const onClientError = (error: Error) => {
      connectionError = error;
      this.logger.error(`PostgreSQL transaction connection lost: ${error.message}`, error.stack);
    };
    client.on("error", onClientError);
    try {
      await client.query("BEGIN");
      const result = await operation(client);
      if (connectionError) throw connectionError;
      await client.query("COMMIT");
      if (connectionError) throw connectionError;
      return result;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        discardError = rollbackError instanceof Error ? rollbackError : new Error(String(rollbackError));
        this.logger.warn(`PostgreSQL rollback failed after transaction error: ${discardError.message}`);
      }
      throw connectionError ?? error;
    } finally {
      client.release(connectionError ?? discardError);
      client.removeListener("error", onClientError);
    }
  }

  async checkConnection(): Promise<void> {
    await this.pool.query("SELECT 1");
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
