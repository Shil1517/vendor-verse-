/** The one method audit/outbox need: satisfied by both the pool wrapper and a
 * transaction client, so a write can join the caller's transaction. */
export interface Queryable {
  query(text: string, values?: unknown[]): Promise<unknown>;
}
