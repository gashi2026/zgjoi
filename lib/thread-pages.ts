type DatedMessage = { id: string; createdAt: string };
/** Never splice separated time windows together as if missing messages did not exist. */
export function mergeThreadPage<T extends DatedMessage>(previous: T[], page: T[], older: boolean) {
  const ids = new Set(previous.map((message) => message.id));
  const overlap = page.some((message) => ids.has(message.id));
  const reset = !older && previous.length > 0 && page.length > 0 && !overlap;
  const rows = reset ? page : older ? [...page, ...previous] : [...previous, ...page];
  const messages = [...new Map(rows.map((message) => [message.id, message])).values()]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  return { messages, reset };
}
