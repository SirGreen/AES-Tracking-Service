import { Target, Rule } from '../types';

// Check if a point is inside a polygon using ray casting algorithm
export function isPointInPolygon(point: [number, number], polygon: Array<[number, number]>): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

// Calculate distance between two points using Haversine formula (in meters)
export function getDistance(point1: [number, number], point2: [number, number]): number {
  const [lat1, lon1] = point1;
  const [lat2, lon2] = point2;
  
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Check if target is within the rule boundaries
export function isTargetInSafeZone(target: Target): boolean {
  const { latitude, longitude, activeRuleId, rules } = target;
  const targetPoint: [number, number] = [latitude, longitude];

  // Find active rule
  const activeRule = rules.find(r => r.id === activeRuleId);
  
  // If no active rule or rule is disabled, return true (safe)
  if (!activeRule || !activeRule.enabled) {
    return true;
  }

  if (activeRule.type === 'circle' && activeRule.center && activeRule.radius) {
    const distance = getDistance(targetPoint, activeRule.center);
    return distance <= activeRule.radius;
  }

  if (activeRule.type === 'polygon' && activeRule.area && activeRule.area.length >= 3) {
    return isPointInPolygon(targetPoint, activeRule.area);
  }

  return true; // Default to safe if rule is incomplete
}

// Update target status based on rule
export function updateTargetStatus(target: Target): Target {
  const isInSafeZone = isTargetInSafeZone(target);
  return {
    ...target,
    status: isInSafeZone ? 'safe' : 'violation'
  };
}

// Update all targets' statuses
export function updateAllTargetsStatus(targets: Target[]): Target[] {
  return targets.map(updateTargetStatus);
}