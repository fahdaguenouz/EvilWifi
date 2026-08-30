import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_URL,
});

export const getLabStatus = async () => {
  const response = await api.get('/lab/status');
  return response.data;
};

export const startLab = async (mode: string, authorized: boolean) => {
  const response = await api.post('/lab/start', { mode, authorized });
  return response.data;
};

export const stopLab = async () => {
  const response = await api.post('/lab/stop');
  return response.data;
};

export const getSessions = async () => {
  const response = await api.get('/sessions/');
  return response.data;
};

export const getDevices = async () => {
  const response = await api.get('/devices/');
  return response.data;
};

export const getEvents = async (limit = 100) => {
  const response = await api.get(`/events/?limit=${limit}`);
  return response.data;
};