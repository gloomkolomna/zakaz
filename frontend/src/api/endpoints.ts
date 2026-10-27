import client from './client';

export type Role = 'player' | 'admin';

export interface MeUser {
  vk_id: number;
  display_name: string | null;
  role: Role;
}

export interface SessionResponse {
  token: string;
  vk_id: number;
  role: Role;
}

export const api = {
  me: () => client.get<MeUser>('/me').then((res) => res.data),
  session: (params: Record<string, string>) =>
    client.post<SessionResponse>('/auth/session', { params }).then((res) => res.data),
};
