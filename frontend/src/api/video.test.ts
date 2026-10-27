import { describe, expect, it } from 'vitest';
import { isExternalVideo, videoPoster, videoSource } from './video';

describe('video', () => {
  it('отдаёт файл приоритетнее ссылки', () => {
    expect(videoSource({ url: 'https://youtu.be/x', file_url: '/api/uploads/a.mp4', poster_url: null }))
      .toBe('/api/uploads/a.mp4');
  });

  it('понимает внешнюю ссылку', () => {
    expect(isExternalVideo({ url: 'https://youtu.be/x', file_url: null, poster_url: null })).toBe(true);
    expect(isExternalVideo({ url: 'https://youtu.be/x', file_url: '/a.mp4', poster_url: null })).toBe(false);
  });

  it('берёт постер или обложку', () => {
    expect(videoPoster({ url: null, file_url: '/a.mp4', poster_url: '/p.jpg' }, '/cover.jpg')).toBe('/p.jpg');
    expect(videoPoster({ url: null, file_url: '/a.mp4', poster_url: null }, '/cover.jpg')).toBe('/cover.jpg');
  });
});
