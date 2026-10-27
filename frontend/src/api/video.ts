export interface Video {
  url: string | null;
  file_url: string | null;
  poster_url: string | null;
}

export function videoSource(video: Video | null | undefined): string | null {
  if (!video) return null;
  return video.file_url || video.url || null;
}

export function isExternalVideo(video: Video | null | undefined): boolean {
  if (!video) return false;
  return !video.file_url && Boolean(video.url);
}

export function videoPoster(video: Video | null | undefined, cover: string | null | undefined): string | null {
  return video?.poster_url || cover || null;
}
