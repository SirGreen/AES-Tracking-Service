import { ApiDeviceResponse, ApiRuleResponse, CreateRuleRequest } from '../types';

const API_BASE_URL = 'http://localhost:5282/api';

export const getDevices = async (): Promise<ApiDeviceResponse[]> => {
  const response = await fetch(`${API_BASE_URL}/devices`);
  if (!response.ok) {
    throw new Error('Failed to fetch devices');
  }
  return response.json();
};

export const getRules = async (childName?: string): Promise<ApiRuleResponse[]> => {
  // If a childName is provided, append it as a query parameter
  const url = childName 
    ? `${API_BASE_URL}/rules?childName=${encodeURIComponent(childName)}` 
    : `${API_BASE_URL}/rules`;
    
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch rules');
  }
  return response.json();
};

export const createRule = async (data: CreateRuleRequest): Promise<ApiRuleResponse> => {
  const response = await fetch(`${API_BASE_URL}/rules`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to create rule');
  }
  return response.json();
};

export const deleteRuleApi = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/rules/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete rule');
  }
};

//Device Pairing API

export interface PairDevicePayload {
  deviceIdentifier: string;
  childName: string;
  batteryPercent?: number;
  latitude?: number | null;
  longitude?: number | null;
}

export const pairDevice = async (data: PairDevicePayload): Promise<ApiDeviceResponse> => {
  const response = await fetch(`${API_BASE_URL}/devices/pair`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to pair device');
  }
  return response.json();
};

export interface UpdateDevicePayload {
  deviceIdentifier: string;
  childName?: string | null;
  batteryPercent: number;
  latitude?: number | null;
  longitude?: number | null;
}

export const updateDevice = async (id: number, data: UpdateDevicePayload): Promise<ApiDeviceResponse> => {
  const response = await fetch(`${API_BASE_URL}/devices/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to update device');
  }
  return response.json();
};

export const deleteDevice = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/devices/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete device');
  }
};

// Debug API

export interface UpdateDeviceLocationPayload {
  latitude: number;
  longitude: number;
  batteryPercent?: number;
}

export const updateDeviceLocation = async (id: number, data: UpdateDeviceLocationPayload): Promise<ApiDeviceResponse> => {
  const response = await fetch(`${API_BASE_URL}/devices/${id}/location`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to update device location');
  }
  return response.json();
};