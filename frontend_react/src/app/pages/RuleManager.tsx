import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Circle, Pentagon, Check, ArrowLeft, Clock, Trash2, Play, Eye, EyeOff } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
// import { mockTargets, mockRules } from '../data/mockData';
import { Rule, Target } from '../types';
import { DashboardMap } from '../components/DashboardMap';
import { toast } from 'sonner';
import { formatScheduleTime, validateScheduleForTarget } from '../utils/ruleScheduler';

import { createRule, getDevices, getRules, deleteRuleApi } from '../api/trackingApi';
import { CreateRuleRequest } from '../types';

export default function RuleManager() {
  const navigate = useNavigate();
  const [targets, setTargets] = useState<Target[]>([]);
  const [allRules, setAllRules] = useState<Rule[]>([]);

  const isValid24HourTime = (value: string): boolean => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);

  // Fetch live devices and rules from the .NET backend
  useEffect(() => {
    const fetchRuleManagerData = async () => {
      try {
        // Fetch both devices and rules simultaneously
        const [apiDevices, apiRules] = await Promise.all([
          getDevices(),
          getRules()
        ]);

        // Map the API Rules to the UI format
        const mappedRules: Rule[] = apiRules.map(r => ({
          id: r.id.toString(),
          name: r.name,
          type: r.ruleType === 'Circle' ? 'circle' : 'polygon',
          targetId: apiDevices.find(d => d.childName === r.childName)?.id.toString() || '',
          schedule: {
            startTime: r.startTime.substring(0, 5),
            endTime: r.endTime.substring(0, 5),
          },
          ...(r.ruleType === 'Circle' && {
            center: [r.centerLatitude!, r.centerLongitude!],
            radius: r.radiusMeters!
          }),
          ...(r.ruleType === 'Polygon' && r.polygonCoordinates && {
            area: r.polygonCoordinates.map(p => [p.latitude, p.longitude] as [number, number])
          })
        }));

        const activeRulesOverride = JSON.parse(localStorage.getItem('activeRules') || '{}');

        // Map the API Devices to the UI format (attaching their specific rules and applying local overrides)
        const mappedTargets: Target[] = apiDevices.map(d => {
          const targetId = d.id.toString();
          return {
            id: targetId,
            name: d.childName || 'Unknown',
            deviceId: d.deviceIdentifier,
            battery: d.batteryPercent,
            status: d.ruleStatus.isViolatingRule ? 'violation' : 'safe',
            latitude: d.latitude || 0,
            longitude: d.longitude || 0,
            rules: mappedRules.filter(rule => rule.targetId === targetId),
            activeRuleId: activeRulesOverride[targetId] !== undefined 
              ? activeRulesOverride[targetId] 
              : (d.ruleStatus.activeRuleId?.toString() || null)
          };
        });

        setAllRules(mappedRules);
        setTargets(mappedTargets);

      } catch (error) {
        console.error("Failed to load Rule Manager data:", error);
        toast.error("Failed to connect to the tracking server.");
      }
    };

    fetchRuleManagerData();
  }, []);

  const [ruleType, setRuleType] = useState<'circle' | 'polygon'>('circle');
  const [drawMode, setDrawMode] = useState<'circle' | 'polygon' | null>(null);
  const [tempRule, setTempRule] = useState<Partial<Rule> | null>(null);
  const [ruleName, setRuleName] = useState('');
  const [ruleRadius, setRuleRadius] = useState('500');
  const [targetForRule, setTargetForRule] = useState<string>('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const hourOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const updateTimePart = (
    current: string,
    part: 'hour' | 'minute',
    value: string
  ): string => {
    const [hour = '00', minute = '00'] = current.split(':');
    return part === 'hour' ? `${value}:${minute}` : `${hour}:${value}`;
  };

  const startHour = startTime.split(':')[0] || '08';
  const startMinute = startTime.split(':')[1] || '00';
  const endHour = endTime.split(':')[0] || '17';
  const endMinute = endTime.split(':')[1] || '00';

  const schedulePresets = [
    { label: 'Morning', start: '06:00', end: '12:00' },
    { label: 'School Time', start: '07:00', end: '16:00' },
    { label: 'Day Shift', start: '08:00', end: '17:00' },
    { label: 'After School', start: '16:00', end: '21:00' },
    { label: 'Night', start: '21:00', end: '06:00' },
    { label: 'All Day', start: '00:00', end: '23:59' },
  ] as const;

  const getScheduleDurationLabel = (start: string, end: string): string => {
    if (!isValid24HourTime(start) || !isValid24HourTime(end)) {
      return 'Invalid time range';
    }

    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;

    let diffMinutes = endTotalMinutes - startTotalMinutes;
    if (diffMinutes <= 0) {
      diffMinutes += 24 * 60;
    }

    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    if (hours === 0) {
      return `${minutes}m`;
    }

    if (minutes === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${minutes}m`;
  };
  const [viewingRuleIds, setViewingRuleIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('viewingRuleIds');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // Ignore malformed local storage payloads.
      }
    }

    const legacySingle = localStorage.getItem('viewingRuleId');
    return legacySingle ? [legacySingle] : [];
  });

  const validateTimeInputs = (): boolean => {
    if (!isValid24HourTime(startTime) || !isValid24HourTime(endTime)) {
      toast.error('Please enter valid time in 24-hour HH:mm format (e.g., 08:00, 23:15)');
      return false;
    }

    if (startTime === endTime) {
      toast.error('Start time and end time cannot be the same');
      return false;
    }

    return true;
  };

  const startDrawing = () => {
    if (!targetForRule) {
      toast.error('Please select a target first');
      return;
    }
    if (!ruleName.trim()) {
      toast.error('Please enter a rule name');
      return;
    }

    if (!validateTimeInputs()) {
      return;
    }
    
    // Validate time schedule
    const validation = validateScheduleForTarget(
      { startTime, endTime },
      targetForRule,
      allRules
    );

    if (!validation.valid && validation.conflictingRule) {
      toast.error(
        `Time conflict with rule "${validation.conflictingRule.name}" (${formatScheduleTime(validation.conflictingRule.schedule)})`
      );
      return;
    }

    setDrawMode(ruleType);
    setTempRule(null);
  };

  const handleDrawComplete = useCallback((rule: Partial<Rule>) => {
    if (rule.type === 'circle') {
      // Override the map's default 500m with the actual input value
      setTempRule({
        ...rule,
        radius: parseInt(ruleRadius) || 500
      });
    } else {
      setTempRule(rule);
    }
  }, [ruleRadius]);

  const saveRule = async () => {
    if (!tempRule || !targetForRule || !ruleName.trim()) {
      toast.error('Please complete all fields');
      return;
    }

    if (tempRule.type === 'polygon' && (!tempRule.area || tempRule.area.length < 3)) {
      toast.error('Polygon must have at least 3 points');
      return;
    }

    if (tempRule.type === 'circle' && !tempRule.center) {
      toast.error('Please click on the map to set circle center');
      return;
    }

    if (!validateTimeInputs()) {
      return;
    }

    // Find the selected target to get the childName for the API payload
    const selectedTargetObj = targets.find(t => t.id === targetForRule);
    if (!selectedTargetObj) {
      toast.error('Selected target not found');
      return;
    }

    // Format the payload for the .NET Backend
    const apiPayload: CreateRuleRequest = {
      name: ruleName.trim(),
      childName: selectedTargetObj.name,
      ruleType: tempRule.type === 'circle' ? 'Circle' : 'Polygon',
      startTime: `${startTime}:00`, 
      endTime: `${endTime}:00`,
      
      // Map Circle data
      centerLatitude: tempRule.type === 'circle' && tempRule.center ? tempRule.center[0] : null,
      centerLongitude: tempRule.type === 'circle' && tempRule.center ? tempRule.center[1] : null,
      radiusMeters: tempRule.type === 'circle' ? (parseInt(ruleRadius) || 500) : null,
      
      // Map Polygon data (convert [lat, lng] arrays to GeoPoint objects)
      polygonCoordinates: tempRule.type === 'polygon' && tempRule.area 
        ? tempRule.area.map(point => ({ latitude: point[0], longitude: point[1] }))
        : null
    };

    try {
      // Send to backend
      const savedApiRule = await createRule(apiPayload);

      // Map the backend response back to the UI format so the map can render it immediately
      const newUiRule: Rule = {
        id: savedApiRule.id.toString(),
        name: savedApiRule.name,
        type: savedApiRule.ruleType === 'Circle' ? 'circle' : 'polygon',
        targetId: targetForRule,
        schedule: {
          startTime: savedApiRule.startTime.substring(0, 5),
          endTime: savedApiRule.endTime.substring(0, 5),
        },
        ...(savedApiRule.ruleType === 'Circle' && {
          center: [savedApiRule.centerLatitude!, savedApiRule.centerLongitude!],
          radius: savedApiRule.radiusMeters!
        }),
        ...(savedApiRule.ruleType === 'Polygon' && {
          area: savedApiRule.polygonCoordinates!.map(p => [p.latitude, p.longitude])
        })
      };

      // Update local state to reflect the new rule
      setAllRules(prev => [...prev, newUiRule]);
      setTargets(prev => prev.map(t => {
        if (t.id === targetForRule) {
          return { ...t, rules: [...t.rules, newUiRule] };
        }
        return t;
      }));

      toast.success(`Rule "${ruleName}" created successfully!`);
      
      // Reset form
      setRuleName('');
      setDrawMode(null);
      setTempRule(null);

    } catch (error: any) {
      console.error("Error saving rule:", error);
      toast.error(error.message || "Failed to save rule to database");
    }
  };

  const handleRadiusChange = (value: string) => {
    setRuleRadius(value);
    if (tempRule?.type === 'circle' && tempRule.center) {
      setTempRule({
        ...tempRule,
        radius: parseInt(value) || 500
      });
    }
  };

  const resetDrawing = () => {
    setDrawMode(null);
    setTempRule(null);
  };


  const setActiveRule = (targetId: string, ruleId: string | null) => {
    setTargets(prev => prev.map(t => {
      if (t.id === targetId) {
        // Persist to localStorage
        const activeRules = JSON.parse(localStorage.getItem('activeRules') || '{}');
        activeRules[targetId] = ruleId;
        localStorage.setItem('activeRules', JSON.stringify(activeRules));
        
        return { ...t, activeRuleId: ruleId };
      }
      return t;
    }));
    toast.success(ruleId ? 'Active rule changed' : 'Rule deactivated');
  };

const deleteRule = async (ruleId: string) => {
    try {
      // 1. Tell backend to delete it (Convert string ID back to number)
      await deleteRuleApi(parseInt(ruleId));

      // 2. Update UI state on success
      setAllRules(prev => prev.filter(r => r.id !== ruleId));
      setTargets(prev => prev.map(t => ({
        ...t,
        rules: t.rules.filter(r => r.id !== ruleId),
        activeRuleId: t.activeRuleId === ruleId ? null : t.activeRuleId
      })));

      setViewingRuleIds(prev => {
        const next = prev.filter(id => id !== ruleId);
        localStorage.setItem('viewingRuleIds', JSON.stringify(next));
        return next;
      });

      // Cleanup localStorage active rules
      const activeRules = JSON.parse(localStorage.getItem('activeRules') || '{}');
      let changed = false;
      for (const targetId in activeRules) {
        if (activeRules[targetId] === ruleId) {
          activeRules[targetId] = null;
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem('activeRules', JSON.stringify(activeRules));
      }

      toast.success('Rule deleted successfully');
    } catch (error) {
      console.error("Error deleting rule:", error);
      toast.error("Failed to delete rule from database");
    }
  };

  const toggleViewRule = (ruleId: string) => {
    setViewingRuleIds(prev => {
      const next = prev.includes(ruleId)
        ? prev.filter(id => id !== ruleId)
        : [...prev, ruleId];

      localStorage.setItem('viewingRuleIds', JSON.stringify(next));
      return next;
    });
  };

  const selectedTarget = targets.find(t => t.id === targetForRule);
  const viewingRules = allRules.filter(r => viewingRuleIds.includes(r.id));

  return (
    <div className="h-full flex gap-6 p-6">
      {/* Left Panel - Wider for better button spacing */}
      <div className="w-[480px] flex-shrink-0 space-y-4 overflow-y-auto">
        {/* Create Rule Form */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate('/app')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-lg font-semibold">Create New Rule</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-2 font-medium">Select Target</label>
              <Select value={targetForRule} onValueChange={setTargetForRule}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a target..." />
                </SelectTrigger>
                <SelectContent>
                  {targets.map((target) => (
                    <SelectItem key={target.id} value={target.id}>
                      {target.name} - {target.deviceId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm mb-2 font-medium">Rule Name</label>
              <Input
                placeholder="Enter rule name..."
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
              />
            </div>

            {/* Time Schedule - REQUIRED */}
            <div className="border rounded-lg p-3 bg-blue-50">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-[#2563eb]" />
                <label className="text-sm font-semibold text-[#2563eb]">Time Schedule (Required)</label>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-700 mb-1 font-medium">Start</label>
                    <div className="flex items-center gap-1">
                      <Select
                        value={startHour}
                        onValueChange={(value) => setStartTime(updateTimePart(startTime, 'hour', value))}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="HH" />
                        </SelectTrigger>
                        <SelectContent>
                          {hourOptions.map((hour) => (
                            <SelectItem key={`start-hour-${hour}`} value={hour}>
                              {hour}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-gray-500">:</span>
                      <Select
                        value={startMinute}
                        onValueChange={(value) => setStartTime(updateTimePart(startTime, 'minute', value))}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="mm" />
                        </SelectTrigger>
                        <SelectContent>
                          {minuteOptions.map((minute) => (
                            <SelectItem key={`start-minute-${minute}`} value={minute}>
                              {minute}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-700 mb-1 font-medium">End</label>
                    <div className="flex items-center gap-1">
                      <Select
                        value={endHour}
                        onValueChange={(value) => setEndTime(updateTimePart(endTime, 'hour', value))}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="HH" />
                        </SelectTrigger>
                        <SelectContent>
                          {hourOptions.map((hour) => (
                            <SelectItem key={`end-hour-${hour}`} value={hour}>
                              {hour}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-gray-500">:</span>
                      <Select
                        value={endMinute}
                        onValueChange={(value) => setEndTime(updateTimePart(endTime, 'minute', value))}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="mm" />
                        </SelectTrigger>
                        <SelectContent>
                          {minuteOptions.map((minute) => (
                            <SelectItem key={`end-minute-${minute}`} value={minute}>
                              {minute}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {schedulePresets.map((preset) => {
                    const isSelected = startTime === preset.start && endTime === preset.end;
                    return (
                      <Button
                        key={preset.label}
                        type="button"
                        size="sm"
                        variant={isSelected ? 'default' : 'outline'}
                        onClick={() => {
                          setStartTime(preset.start);
                          setEndTime(preset.end);
                        }}
                        className={`text-xs h-8 ${
                          isSelected ? 'bg-[#2563eb] hover:bg-[#1d4ed8]' : 'bg-white'
                        }`}
                      >
                        {preset.label}
                      </Button>
                    );
                  })}
                </div>

                <div className="rounded-md border border-blue-100 bg-white px-3 py-2 text-xs text-gray-700">
                  <p>
                    Active from <span className="font-semibold text-[#2563eb]">{startTime}</span> to{' '}
                    <span className="font-semibold text-[#2563eb]">{endTime}</span>
                    {startTime > endTime ? ' (overnight)' : ''}
                  </p>
                  <p className="mt-1 text-gray-600">Duration: {getScheduleDurationLabel(startTime, endTime)}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2 font-medium">Rule Type</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={ruleType === 'circle' ? 'default' : 'outline'}
                  onClick={() => {
                    setRuleType('circle');
                    resetDrawing();
                  }}
                  className={ruleType === 'circle' ? 'bg-[#3b82f6] hover:bg-[#2563eb]' : ''}
                >
                  <Circle className="w-4 h-4 mr-2" />
                  Circle
                </Button>
                <Button
                  variant={ruleType === 'polygon' ? 'default' : 'outline'}
                  onClick={() => {
                    setRuleType('polygon');
                    resetDrawing();
                  }}
                  className={ruleType === 'polygon' ? 'bg-[#ef4444] hover:bg-[#dc2626]' : ''}
                >
                  <Pentagon className="w-4 h-4 mr-2" />
                  Polygon
                </Button>
              </div>
            </div>

            {ruleType === 'circle' && (
              <div>
                <label className="block text-sm mb-2 font-medium">Radius (meters)</label>
                <Input
                  type="number"
                  min="50"
                  max="5000"
                  step="50"
                  value={ruleRadius}
                  onChange={(e) => handleRadiusChange(e.target.value)}
                  placeholder="500"
                />
              </div>
            )}

            {!drawMode ? (
              <Button
                onClick={startDrawing}
                className="w-full bg-[#2563eb] hover:bg-[#1d4ed8]"
              >
                Start Drawing on Map
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 mb-2">
                    {ruleType === 'circle' 
                      ? '📍 Click on the map to place the center of the circle'
                      : `📍 Click on the map to add points`
                    }
                  </p>
                  {ruleType === 'polygon' && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-900">
                        Points added: {tempRule?.area?.length || 0}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        (tempRule?.area?.length || 0) >= 3 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {(tempRule?.area?.length || 0) >= 3 ? '✓ Ready' : 'Need 3+ points'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={saveRule}
                    disabled={
                      !tempRule || 
                      (ruleType === 'polygon' && (!tempRule.area || tempRule.area.length < 3)) ||
                      (ruleType === 'circle' && !tempRule.center)
                    }
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Save Rule
                  </Button>
                  <Button
                    onClick={resetDrawing}
                    variant="outline"
                  >
                    Reset
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* All Rules List */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center justify-between">
            <span>All Rules ({allRules.length})</span>
          </h3>
          
          {allRules.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No rules created yet. Create your first rule above.
            </p>
          ) : (
            <div className="space-y-3">
              {targets.map((target) => {
                const targetRules = allRules.filter(r => r.targetId === target.id);
                if (targetRules.length === 0) return null;

                return (
                  <div key={target.id} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                      <div>
                        <h4 className="font-semibold text-sm">{target.name}</h4>
                        <p className="text-xs text-gray-600">{target.deviceId}</p>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {targetRules.length} {targetRules.length === 1 ? 'rule' : 'rules'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {targetRules.map((rule) => (
                        <div
                          key={rule.id}
                          className={`p-3 border rounded-lg bg-white transition-all ${
                            rule.id === target.activeRuleId
                              ? 'border-[#2563eb] shadow-sm'
                              : viewingRuleIds.includes(rule.id)
                              ? 'border-green-500 shadow-sm'
                              : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="font-medium text-sm">{rule.name}</h5>
                                {rule.id === target.activeRuleId && (
                                  <span className="px-2 py-0.5 bg-[#2563eb] text-white text-xs rounded font-medium">
                                    ACTIVE
                                  </span>
                                )}
                                {viewingRuleIds.includes(rule.id) && (
                                  <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded font-medium">
                                    VIEWING
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                                <span className="flex items-center gap-1">
                                  {rule.type === 'circle' ? '⭕' : '🔷'} 
                                  {rule.type === 'circle' ? 'Circle' : 'Polygon'}
                                  {rule.type === 'circle' && rule.radius && (
                                    <span className="text-gray-500">({rule.radius}m)</span>
                                  )}
                                </span>
                                <span className="flex items-center gap-1">
                                  ⏰ {formatScheduleTime(rule.schedule)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-100">
                            {/* Active/Deactivate Switch */}
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={rule.id === target.activeRuleId}
                                onCheckedChange={(checked) => setActiveRule(target.id, checked ? rule.id : null)}
                              />
                              <span className={`text-xs font-medium whitespace-nowrap ${
                                rule.id === target.activeRuleId ? 'text-blue-600' : 'text-gray-400'
                              }`}>
                                {rule.id === target.activeRuleId ? 'Deactivate' : 'Activate'}
                              </span>
                            </div>

                            {/* Button Group */}
                            <div className="flex items-center gap-1.5 ml-auto">
                              {/* View on Map Button */}
                              <Button
                                size="sm"
                                variant={viewingRuleIds.includes(rule.id) ? 'default' : 'outline'}
                                onClick={() => toggleViewRule(rule.id)}
                                className={`text-xs h-7 px-2 ${
                                  viewingRuleIds.includes(rule.id)
                                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                                    : ''
                                }`}
                              >
                                {viewingRuleIds.includes(rule.id) ? (
                                  <><EyeOff className="w-3 h-3 mr-1" />Hide</>
                                ) : (
                                  <><Eye className="w-3 h-3 mr-1" />View</>
                                )}
                              </Button>

                              {/* Delete Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteRule(rule.id)}
                                className="text-red-600 hover:bg-red-50 h-7 px-2"
                                title="Delete rule"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Right Panel - Map */}
      <div className="flex-1">
        <Card className="h-full p-0 overflow-hidden">
          <DashboardMap
            targets={targets}
            selectedTarget={selectedTarget || null}
            onTargetClick={() => {}}
            drawMode={drawMode}
            onDrawComplete={handleDrawComplete}
            tempRule={tempRule}
            viewingRules={viewingRules}
          />
        </Card>
      </div>
    </div>
  );
}