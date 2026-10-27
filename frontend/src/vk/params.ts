export interface VkLaunchParams {
  vkUserId: number | null;
  params: Record<string, string>;
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseVkParams(...sources: string[]): VkLaunchParams {
  const params: Record<string, string> = {};
  let vkUserId: number | null = null;

  for (const source of sources) {
    if (!source) continue;
    const query = source.startsWith('?') || source.startsWith('#')
      ? source.slice(1)
      : source;
    if (!query) continue;

    for (const pair of query.split('&')) {
      const eq = pair.indexOf('=');
      if (eq <= 0) continue;
      const key = pair.slice(0, eq);
      const value = decode(pair.slice(eq + 1));
      params[key] = value;
      if (key === 'vk_user_id') {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed > 0) vkUserId = parsed;
      }
    }
  }

  return { vkUserId, params };
}

export function parseVkParamsFromUrl(): VkLaunchParams {
  return parseVkParams(window.location.search, window.location.hash);
}
