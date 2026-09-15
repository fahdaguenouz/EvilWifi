import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_URL,
});

export const getLabStatus = async () => {
  const response = await api.get('/lab/status');
  return response.data;
};

export const startLab = async (mode: string, authorized: boolean, ssid: string, networkInterface: string) => {
  const response = await api.post('/lab/start', { mode, authorized, ssid, interface: networkInterface });
  return response.data;
};

export const getNetworkInterfaces = async () => {
  const response = await api.get('/lab/interfaces');
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

export const getPortalStatus = async () => {
  const response = await api.get('/portal/status');
  return response.data;
};

export const openTrainingPortal = async () => {
  const response = await api.post('/portal/open');
  return response.data;
};

export const enterTrainingSession = async (trainingUser: string, trainingToken: string) => {
  const response = await api.post('/portal/enter', {
    training_user: trainingUser,
    training_token: trainingToken,
  });
  return response.data;
};

export const getAnalysisSummary = async () => {
  const response = await api.get('/analysis/summary');
  return response.data;
};

export const getProtocolCatalog = async () => {
  const response = await api.get('/analysis/protocols');
  return response.data;
};

export const getAlerts = async (limit = 100) => {
  const response = await api.get(`/alerts/?limit=${limit}`);
  return response.data;
};

export const getDetectionRules = async () => {
  const response = await api.get('/alerts/rules');
  return response.data;
};

export const getLearningModules = async () => {
  const response = await api.get('/education/topics');
  return response.data;
};
