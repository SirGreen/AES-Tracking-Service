import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Icon } from 'leaflet';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Battery, BatteryLow, BatteryWarning, Plus, Search, MapPin } from 'lucide-react';
import { Target, Rule } from '../types';
import { DashboardMap } from '../components/DashboardMap';
import { updateAllTargetsStatus } from '../utils/geofencing';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

// API
import { getDevices, getRules } from '../api/trackingApi';

// Fix for default markers in React Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export default function Dashboard() {
  const navigate = useNavigate();
  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);

// Fetch real devices and rules from the .NET backend
  useEffect(() => {
    const fetchTargets = async () => {
      try {
        // Fetch both to get rule names
        const [apiDevices, apiRules] = await Promise.all([
          getDevices(),
          getRules()
        ]);
        
        // Map the rules first
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

        // Map the devices
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

        const targetsWithComputedStatus = updateAllTargetsStatus(mappedTargets);

        setTargets(targetsWithComputedStatus);

        // Keep selected target in sync without re-triggering the polling effect.
        setSelectedTarget((previous) => {
          if (!previous) {
            return targetsWithComputedStatus[0] ?? null;
          }

          return targetsWithComputedStatus.find((target) => target.id === previous.id) ?? null;
        });
      } catch (error) {
        console.error("Failed to load targets from API:", error);
      }
    };

    fetchTargets();
    const intervalId = setInterval(fetchTargets, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a location to search');
      return;
    }

    setIsSearching(true);
    
    try {
      // Use Nominatim API for geocoding (free OpenStreetMap service)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`
      );
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const location = data[0];
        setSearchedLocation({
          lat: parseFloat(location.lat),
          lng: parseFloat(location.lon),
          name: location.display_name
        });
        toast.success(`Found: ${location.display_name}`);
      } else {
        toast.error('Location not found. Try a different search term.');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search location. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getBatteryIcon = (battery: number) => {
    if (battery > 50) return <Battery className="w-4 h-4" />;
    if (battery > 20) return <BatteryWarning className="w-4 h-4" />;
    return <BatteryLow className="w-4 h-4" />;
  };

  const getBatteryColor = (battery: number) => {
    if (battery > 50) return 'text-green-600';
    if (battery > 20) return 'text-orange-500';
    return 'text-red-600';
  };

  const handleTargetClick = (target: Target) => {
    setSelectedTarget(target);
  };

  return (
    <div className="h-full flex flex-col gap-4 p-6">
      {/* Search Bar */}
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-gray-500" />
          <Input
            placeholder="Search for a location (e.g., District 10, Ho Chi Minh City, Vietnam)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            className="flex-1"
          />
          <Button
            onClick={handleSearch}
            disabled={isSearching}
            className="bg-[#2563eb] hover:bg-[#1d4ed8]"
          >
            <Search className="w-4 h-4 mr-2" />
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </div>
        {searchedLocation && (
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-green-600" />
            <span className="truncate">{searchedLocation.name}</span>
          </div>
        )}
      </Card>

      {/* Main Content */}
      <div className="flex-1 flex gap-6 overflow-hidden">
      {/* Left Panel - Target List and Create Rule */}
      <div className="w-96 flex flex-col gap-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg">Monitored Targets</h2>
          <Button
            size="sm"
            onClick={() => navigate('/app/rule-manager')}
            className="bg-[#2563eb] hover:bg-[#1d4ed8]"
          >
            <Plus className="w-4 h-4 mr-1" />
            New Rule
          </Button>
        </div>
        
        {targets.map((target) => (
          <Card
            key={target.id}
            onClick={() => setSelectedTarget(target)}
            className={`p-4 cursor-pointer transition-colors border-b border-gray-200 ${
              selectedTarget?.id === target.id
                ? 'bg-blue-50 border-l-4 border-l-[#2563eb]'
                : target.status === 'violation'
                ? 'bg-red-50'
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold">{target.name}</h3>
                <p className="text-sm text-gray-600">{target.deviceId}</p>
              </div>
              <Badge 
                variant={target.status === 'safe' ? 'default' : 'destructive'}
                className={target.status === 'safe' ? 'bg-green-500' : 'bg-red-500'}
              >
                {target.status === 'safe' ? 'Safe' : 'Violation'}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              {getBatteryIcon(target.battery)}
              <span>{target.battery}%</span>
            </div>

            {(() => {
              const activeRule = target.rules.find(r => r.id === target.activeRuleId);
              if (!activeRule) return (
                <div className="mt-3 p-2 rounded-md w-full bg-gray-50 border border-gray-100 text-gray-400 text-xs italic text-center">
                  No active rule
                </div>
              );

              return (
                <div className={`mt-3 p-2 rounded-md w-full flex items-center justify-between transition-all ${
                  target.status === 'safe' 
                    ? 'bg-green-50 border border-green-100' 
                    : 'bg-red-50 border border-red-100'
                }`}>
                  <p className={`text-xs font-medium truncate pr-2 ${
                    target.status === 'safe' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {activeRule.name} ({activeRule.type})
                  </p>
                </div>
              );
            })()}
          </Card>
        ))}
      </div>

      {/* Right Panel - Map */}
      <div className="flex-1">
        <Card className="h-full p-0 overflow-hidden">
          <DashboardMap
            targets={targets}
            selectedTarget={selectedTarget}
            onTargetClick={handleTargetClick}
            searchedLocation={searchedLocation}
          />
        </Card>
      </div>
      </div>
    </div>
  );
}