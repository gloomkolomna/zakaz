export function matchesVkSession(sessionVkId: number, vkUserId: number | null): boolean {
  return sessionVkId === vkUserId;
}
