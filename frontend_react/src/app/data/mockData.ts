import { Target, Device, Notification, Rule } from '../types';

// Mock rules data
export const mockRules: Rule[] = [
  {
    id: 'rule-1',
    name: 'School Zone',
    type: 'polygon',
    area: [
      [14.5990, 120.9830],
      [14.6010, 120.9830],
      [14.6010, 120.9860],
      [14.5990, 120.9860],
    ],
    enabled: true,
    targetId: '1',
    schedule: {
      startTime: '07:00',
      endTime: '17:00',
    },
  },
  {
    id: 'rule-2',
    name: 'Home Area',
    type: 'circle',
    center: [14.5995, 120.9842],
    radius: 100,
    enabled: true,
    targetId: '1',
    schedule: {
      startTime: '18:00',
      endTime: '06:59',
    },
  },
  {
    id: 'rule-3',
    name: 'Home Radius',
    type: 'circle',
    center: [14.6020, 120.9900],
    radius: 200,
    enabled: true,
    targetId: '2',
    schedule: {
      startTime: '00:00',
      endTime: '23:59',
    },
  },
  {
    id: 'rule-4',
    name: 'Park Area',
    type: 'circle',
    center: [14.6020, 120.9900],
    radius: 150,
    enabled: true,
    targetId: '3',
    schedule: {
      startTime: '08:00',
      endTime: '18:00',
    },
  },
  {
    id: 'rule-5',
    name: 'Shopping Mall Zone',
    type: 'polygon',
    area: [
      [14.6015, 120.9885],
      [14.6025, 120.9885],
      [14.6025, 120.9905],
      [14.6015, 120.9905],
    ],
    enabled: false,
    targetId: '3',
    schedule: {
      startTime: '19:00',
      endTime: '21:00',
    },
  },
];

// Mock data for targets with multiple rules
export const mockTargets: Target[] = [
  {
    id: '1',
    name: 'Son',
    deviceId: 'DEV-001',
    battery: 85,
    status: 'safe',
    latitude: 14.5995,
    longitude: 120.9842,
    rules: mockRules.filter(r => r.targetId === '1'),
    activeRuleId: 'rule-1',
  },
  {
    id: '2',
    name: 'Daughter B',
    deviceId: 'DEV-002',
    battery: 45,
    status: 'violation',
    latitude: 14.6050,
    longitude: 120.9920,
    rules: mockRules.filter(r => r.targetId === '2'),
    activeRuleId: 'rule-3',
  },
  {
    id: '3',
    name: 'Son C',
    deviceId: 'DEV-003',
    battery: 92,
    status: 'safe',
    latitude: 14.6020,
    longitude: 120.9895,
    rules: mockRules.filter(r => r.targetId === '3'),
    activeRuleId: 'rule-4',
  },
];

// Mock data for paired devices
export const mockDevices: Device[] = [
  {
    id: '1',
    deviceId: 'DEV-001',
    childName: 'Son',
    battery: 85,
    connected: true,
  },
  {
    id: '2',
    deviceId: 'DEV-002',
    childName: 'Daughter B',
    battery: 45,
    connected: true,
  },
  {
    id: '3',
    deviceId: 'DEV-003',
    childName: 'Son C',
    battery: 92,
    connected: true,
  },
  {
    id: '4',
    deviceId: 'DEV-004',
    childName: 'Daughter D',
    battery: 15,
    connected: false,
  },
];

// Mock data for notifications
export const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'rule-violation',
    targetName: 'Daughter B',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    message: 'Daughter B has left the Home Radius zone',
    read: false,
  },
  {
    id: '2',
    type: 'low-battery',
    targetName: 'Daughter B',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    message: 'Device battery is below 50%',
    read: false,
  },
  {
    id: '3',
    type: 'critical-battery',
    targetName: 'Daughter D',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    message: 'Device battery is critically low (15%)',
    read: false,
  },
  {
    id: '4',
    type: 'lost-connection',
    targetName: 'Daughter D',
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    message: 'Lost connection with device DEV-004',
    read: true,
  },
  {
    id: '5',
    type: 'low-battery',
    targetName: 'Son',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    message: 'Device battery is below 50%',
    read: true,
  },
];