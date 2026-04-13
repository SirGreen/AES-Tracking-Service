import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Circle, Pentagon, Check, ArrowLeft, Clock, Trash2, Play, Eye, EyeOff } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { mockTargets, mockRules } from '../data/mockData';
import { Rule, Target } from '../types';
import { DashboardMap } from '../components/DashboardMap';
import { toast } from 'sonner';
import { formatScheduleTime, validateScheduleForTarget } from '../utils/ruleScheduler';

export default function RuleManager() {
  const navigate = useNavigate();
  const [targets, setTargets] = useState(mockTargets);
  const [allRules, setAllRules] = useState(mockRules);
  const [ruleType, setRuleType] = useState<'circle' | 'polygon'>('circle');
  const [drawMode, setDrawMode] = useState<'circle' | 'polygon' | null>(null);
  const [tempRule, setTempRule] = useState<Partial<Rule> | null>(null);
  const [ruleName, setRuleName] = useState('');
  const [ruleRadius, setRuleRadius] = useState('500');
  const [targetForRule, setTargetForRule] = useState<string>('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [viewingRuleId, setViewingRuleId] = useState<string | null>(null);

  const startDrawing = () => {
    if (!targetForRule) {
      toast.error('Please select a target first');
      return;
    }
    if (!ruleName.trim()) {
      toast.error('Please enter a rule name');
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
    setTempRule(rule);
  }, []);

  const saveRule = () => {
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

    // Validate time again before saving
    const validation = validateScheduleForTarget(
      { startTime, endTime },
      targetForRule,
      allRules
    );

    if (!validation.valid && validation.conflictingRule) {
      toast.error(
        `Time conflict with rule "${validation.conflictingRule.name}"`
      );
      return;
    }

    const newRule: Rule = {
      id: `rule-${Date.now()}`,
      name: ruleName.trim(),
      type: tempRule.type as 'circle' | 'polygon',
      enabled: true,
      targetId: targetForRule,
      schedule: {
        startTime,
        endTime,
      },
      ...(tempRule.type === 'circle' && {
        center: tempRule.center,
        radius: parseInt(ruleRadius) || 500
      }),
      ...(tempRule.type === 'polygon' && {
        area: tempRule.area
      })
    };

    // Add to rules list
    setAllRules(prev => [...prev, newRule]);

    // Update target's rules
    setTargets(prev => prev.map(t => {
      if (t.id === targetForRule) {
        return {
          ...t,
          rules: [...t.rules, newRule],
        };
      }
      return t;
    }));

    toast.success(`Rule "${ruleName}" created successfully!`);
    
    // Reset form
    setRuleName('');
    setDrawMode(null);
    setTempRule(null);
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

  const toggleRuleEnabled = (ruleId: string) => {
    setAllRules(prev => prev.map(r => {
      if (r.id === ruleId) {
        return { ...r, enabled: !r.enabled };
      }
      return r;
    }));

    setTargets(prev => prev.map(t => ({
      ...t,
      rules: t.rules.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r)
    })));

    toast.success('Rule status updated');
  };

  const setActiveRule = (targetId: string, ruleId: string) => {
    setTargets(prev => prev.map(t => {
      if (t.id === targetId) {
        return { ...t, activeRuleId: ruleId };
      }
      return t;
    }));
    toast.success('Active rule changed');
  };

  const deleteRule = (ruleId: string) => {
    const rule = allRules.find(r => r.id === ruleId);
    if (!rule) return;

    setAllRules(prev => prev.filter(r => r.id !== ruleId));
    
    setTargets(prev => prev.map(t => ({
      ...t,
      rules: t.rules.filter(r => r.id !== ruleId),
      activeRuleId: t.activeRuleId === ruleId ? null : t.activeRuleId
    })));

    // Clear viewing if this was the rule being viewed
    if (viewingRuleId === ruleId) {
      setViewingRuleId(null);
    }

    toast.success('Rule deleted');
  };

  const toggleViewRule = (ruleId: string) => {
    if (viewingRuleId === ruleId) {
      setViewingRuleId(null);
    } else {
      setViewingRuleId(ruleId);
    }
  };

  const selectedTarget = targets.find(t => t.id === targetForRule);
  const viewingRule = viewingRuleId ? allRules.find(r => r.id === viewingRuleId) : null;

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

              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-700 mb-1 font-medium">Start Time</label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-700 mb-1 font-medium">End Time</label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  💡 Active from {startTime} to {endTime}
                  {startTime > endTime && ' (overnight)'}
                </p>
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
                              : viewingRuleId === rule.id
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
                                {viewingRuleId === rule.id && (
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
                            {/* Enable/Disable Toggle */}
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={rule.enabled}
                                onCheckedChange={() => toggleRuleEnabled(rule.id)}
                              />
                              <span className={`text-xs font-medium whitespace-nowrap ${
                                rule.enabled ? 'text-green-600' : 'text-gray-400'
                              }`}>
                                {rule.enabled ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>

                            {/* Button Group */}
                            <div className="flex items-center gap-1.5 ml-auto">
                              {/* View on Map Button */}
                              <Button
                                size="sm"
                                variant={viewingRuleId === rule.id ? 'default' : 'outline'}
                                onClick={() => toggleViewRule(rule.id)}
                                className={`text-xs h-7 px-2 ${
                                  viewingRuleId === rule.id 
                                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                                    : ''
                                }`}
                              >
                                {viewingRuleId === rule.id ? (
                                  <><EyeOff className="w-3 h-3 mr-1" />Hide</>
                                ) : (
                                  <><Eye className="w-3 h-3 mr-1" />View</>
                                )}
                              </Button>

                              {/* Set Active Button */}
                              {rule.id !== target.activeRuleId && rule.enabled && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setActiveRule(target.id, rule.id)}
                                  className="text-xs h-7 px-2 whitespace-nowrap"
                                >
                                  <Play className="w-3 h-3 mr-1" />
                                  Activate
                                </Button>
                              )}

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
            viewingRule={viewingRule}
          />
        </Card>
      </div>
    </div>
  );
}