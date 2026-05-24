import { lsBust } from "./cache";

export const TICKETS_TTL = 2 * 60_000;

export function ticketsCacheKey() {
  const token = localStorage.getItem("userToken");
  return `tickets:${token?.slice(-24) || "anon"}`;
}

export function bustTicketsCache() {
  lsBust(ticketsCacheKey());
}
