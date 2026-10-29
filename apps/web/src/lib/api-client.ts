import {
  AuthMeResponseDto,
  LoginRequestDto,
  LoginResponseDto,
  ApiResponseEnvelope,
  ApiErrorResponseEnvelope,
} from '@darb/contracts';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    const errorEnvelope = data as ApiErrorResponseEnvelope;
    const message = Array.isArray(errorEnvelope.message)
      ? errorEnvelope.message.join(', ')
      : errorEnvelope.message || 'حدث خطأ أثناء معالجة الطلب';
    throw new Error(message);
  }
  const envelope = data as ApiResponseEnvelope<T>;
  return envelope.data;
}

export const apiClient = {
  async login(payload: LoginRequestDto): Promise<LoginResponseDto> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return handleResponse<LoginResponseDto>(res);
  },

  async logout(): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    return handleResponse<{ message: string }>(res);
  },

  async getMe(): Promise<AuthMeResponseDto> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<AuthMeResponseDto>(res);
  },

  async checkLive(): Promise<{ status: string; uptime: number }> {
    const res = await fetch(`${API_BASE}/health/live`);
    return handleResponse<{ status: string; uptime: number }>(res);
  },

  async checkReady(): Promise<{ status: string; database: string }> {
    const res = await fetch(`${API_BASE}/health/ready`);
    return handleResponse<{ status: string; database: string }>(res);
  },
};
