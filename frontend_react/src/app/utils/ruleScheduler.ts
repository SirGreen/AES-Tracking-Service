import { Rule, Target } from '../types';

/**
 * Check if current time is within the rule's schedule
 */
export function isRuleActiveBySchedule(rule: Rule): boolean {
  if (!rule.schedule) return true; // No schedule means always active

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  const { startTime, endTime } = rule.schedule;

  // Handle overnight schedules (e.g., 18:00 - 06:59)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime;
  }

  // Normal schedule (e.g., 07:00 - 17:00)
  return currentTime >= startTime && currentTime <= endTime;
}

/**
 * Get the active rule for a target based on current time and enabled status
 */
export function getActiveRuleForTarget(target: Target): Rule | null {
  // Get all enabled rules
  const enabledRules = target.rules.filter(r => r.enabled);

  if (enabledRules.length === 0) return null;

  // Check for scheduled rules that are active now
  const scheduledActiveRules = enabledRules.filter(isRuleActiveBySchedule);

  if (scheduledActiveRules.length > 0) {
    // Return the first scheduled rule that's active
    return scheduledActiveRules[0];
  }

  // If no scheduled rule is active, return first enabled rule without schedule
  const noScheduleRules = enabledRules.filter(r => !r.schedule);
  return noScheduleRules[0] || null;
}

/**
 * Update target's activeRuleId based on schedules
 */
export function updateTargetActiveRule(target: Target): Target {
  const activeRule = getActiveRuleForTarget(target);
  
  return {
    ...target,
    activeRuleId: activeRule?.id || null,
  };
}

/**
 * Update all targets' active rules based on current time
 */
export function updateAllTargetsActiveRules(targets: Target[]): Target[] {
  return targets.map(updateTargetActiveRule);
}

/**
 * Format time for display
 */
export function formatScheduleTime(schedule: Rule['schedule']): string {
  // Safety check for undefined schedule
  if (!schedule || !schedule.startTime || !schedule.endTime) {
    return 'No schedule';
  }
  
  const { startTime, endTime } = schedule;
  
  // Handle overnight schedule
  if (startTime > endTime) {
    return `${startTime} - ${endTime} (overnight)`;
  }
  
  return `${startTime} - ${endTime}`;
}

/**
 * Check if two time ranges overlap
 */
export function doTimeRangesOverlap(
  range1: { startTime: string; endTime: string },
  range2: { startTime: string; endTime: string }
): boolean {
  const { startTime: start1, endTime: end1 } = range1;
  const { startTime: start2, endTime: end2 } = range2;

  // Convert time strings to minutes for easier comparison
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);

  // Handle overnight schedules
  const isOvernight1 = start1 > end1;
  const isOvernight2 = start2 > end2;

  if (isOvernight1 && isOvernight2) {
    // Both are overnight - they always overlap
    return true;
  }

  if (isOvernight1) {
    // Range 1 is overnight (e.g., 22:00 - 06:00)
    // Overlaps if range2 starts before range1 ends OR after range1 starts
    return s2 < e1 || s2 >= s1 || e2 > s1 || e2 <= e1;
  }

  if (isOvernight2) {
    // Range 2 is overnight
    return s1 < e2 || s1 >= s2 || e1 > s2 || e1 <= e2;
  }

  // Normal ranges - check standard overlap
  return (s1 < e2 && e1 > s2);
}

/**
 * Validate if a new schedule conflicts with existing rules for the same target
 */
export function validateScheduleForTarget(
  newSchedule: { startTime: string; endTime: string },
  targetId: string,
  allRules: Rule[],
  excludeRuleId?: string // For editing existing rules
): { valid: boolean; conflictingRule?: Rule } {
  const targetRules = allRules.filter(
    r => r.targetId === targetId && r.enabled && r.id !== excludeRuleId
  );

  for (const rule of targetRules) {
    if (doTimeRangesOverlap(newSchedule, rule.schedule)) {
      return { valid: false, conflictingRule: rule };
    }
  }

  return { valid: true };
}