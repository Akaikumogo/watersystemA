/** Map TypeORM `id` to legacy `_id` for API responses that matched Mongoose. */
export function toApiDoc(row: Record<string, unknown> | null | undefined): any {
  if (row == null) return row;
  const plain = { ...row } as Record<string, unknown>;
  if (plain.id != null) plain._id = plain.id;
  return plain;
}

export function toApiDocs(rows: Record<string, unknown>[]): any[] {
  return rows.map((r) => toApiDoc(r));
}
