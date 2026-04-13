export interface Target {
  id: string;
  name: string;
  deviceId: string;
  battery: number;
  status: 'safe' | 'violation';
  latitude: number;
  longitude: number;
  rules: Rule[]; // Multiple rules per target
  activeRuleId: string | null; // ID of the currently active rule
}

export interface Rule {
  id: string;
  name: string;
  type: 'polygon' | 'circle';
  area?: Array<[number, number]>; // For polygon
  center?: [number, number]; // For circle
  radius?: number; // For circle (in meters)
  enabled: boolean; // Can be disabled/enabled
  targetId: string; // Which target this rule belongs to
  schedule: {
    startTime: string; // Format: "HH:mm" (e.g., "08:00") - REQUIRED
    endTime: string; // Format: "HH:mm" (e.g., "17:00") - REQUIRED
  };
}

export interface Device {
  id: string;
  deviceId: string;
  childName: string;
  battery: number;
  connected: boolean;
}

export interface Notification {
  id: string;
  type: 'low-battery' | 'critical-battery' | 'lost-connection' | 'rule-violation';
  targetName: string;
  timestamp: Date;
  message: string;
  read: boolean;
}