import { useEffect, useState } from 'react';
import type { Filters } from '../shared/types';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(url: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api${url}`, {
    method,
    headers:
      method === 'GET' ? {} : { 'Content-Type': 'application/json', 'X-Requested-With': 'MovilidadAragon' },
    body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
  });
  const data: unknown = await response.json();
  if (!response.ok) {
    if (response.status === 401 && url !== '/login' && url !== '/me')
      window.dispatchEvent(new Event('session-expired'));
    throw new ApiError(
      typeof data === 'object' && data && 'error' in data
        ? String(data.error)
        : 'No se pudo completar la solicitud.',
      response.status,
    );
  }
  return data as T;
}
export function useQuery<T>(path: string | null, revision: number) {
  const [state, setState] = useState<{ data: T | null; error: string; loading: boolean }>({
    data: null,
    error: '',
    loading: true,
  });
  useEffect(() => {
    let active = true;
    if (!path) {
      setState({ data: null, error: '', loading: false });
      return;
    }
    setState((previous) => ({ ...previous, loading: true, error: '' }));
    api<T>(path)
      .then((data) => {
        if (active) setState({ data, error: '', loading: false });
      })
      .catch((error: Error) => {
        if (active) setState({ data: null, error: error.message, loading: false });
      });
    return () => {
      active = false;
    };
  }, [path, revision]);
  return state;
}
export function query(filters: Filters) {
  return new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value !== '' && value !== undefined) as [string, string][],
  ).toString();
}
export const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export const daysBefore = (days: number) =>
  new Date(Date.parse(`${today()}T12:00:00-06:00`) - days * 86400000).toISOString().slice(0, 10);
export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
export const formatTime = (value: string) =>
  new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value));
export const number = (value: number) => new Intl.NumberFormat('es-MX').format(value);
export const localDatetime = () => `${today()}T${formatTime(new Date().toISOString())}`;
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'No se pudo completar la operación.';
