import { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  MapPin, 
  Battery, 
  Loader2, 
  Save, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { ApiDeviceResponse } from '../types';
import { toast } from 'sonner';
import { getDevices, updateDeviceLocation } from '../api/trackingApi';

export default function DebugPage() {
  const [devices, setDevices] = useState<ApiDeviceResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  
  // Form state
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [battery, setBattery] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const data = await getDevices();
      setDevices(data);
    } catch (error) {
      console.error('Failed to fetch devices:', error);
      toast.error('Failed to fetch devices for debug');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const selectedDevice = devices.find(d => d.id === selectedDeviceId);

  useEffect(() => {
    if (selectedDevice) {
      setLat(selectedDevice.latitude?.toString() || '');
      setLng(selectedDevice.longitude?.toString() || '');
      setBattery(selectedDevice.batteryPercent.toString());
    }
  }, [selectedDeviceId, selectedDevice]);

  const handleUpdate = async () => {
    if (!selectedDeviceId) return;

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const batteryPercent = parseInt(battery);

    if (isNaN(latitude) || isNaN(longitude)) {
      toast.error('Invalid coordinates');
      return;
    }

    if (isNaN(batteryPercent) || batteryPercent < 0 || batteryPercent > 100) {
      toast.error('Battery must be between 0 and 100');
      return;
    }

    setIsUpdating(true);
    try {
      const updated = await updateDeviceLocation(selectedDeviceId, {
        latitude,
        longitude,
        batteryPercent
      });
      
      setDevices(prev => prev.map(d => d.id === selectedDeviceId ? updated : d));
      toast.success('Device status updated successfully!');
    } catch (error: any) {
      console.error('Failed to update device:', error);
      toast.error(error.message || 'Failed to update device');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertCircle className="text-amber-500" />
            Device Debug Simulator
          </h1>
          <p className="text-gray-500">Manually override device parameters for testing</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDevices} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Devices
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Device List */}
        <div className="md:col-span-1 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Select Device</h2>
          {isLoading && devices.length === 0 ? (
            <div className="p-4 text-center text-gray-400">Loading...</div>
          ) : devices.length === 0 ? (
            <div className="p-4 text-center text-gray-400 border border-dashed rounded-lg">No devices found</div>
          ) : (
            devices.map(device => (
              <button
                key={device.id}
                onClick={() => setSelectedDeviceId(device.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedDeviceId === device.id
                    ? 'border-[#2563eb] bg-blue-50 ring-2 ring-blue-100'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900">{device.childName || 'Unnamed Device'}</div>
                <div className="text-xs font-mono text-gray-500 mt-1">{device.deviceIdentifier}</div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {device.batteryPercent}% Battery
                  </Badge>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Debug Controls */}
        <div className="md:col-span-2">
          {selectedDeviceId ? (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                Configure: <span className="text-[#2563eb]">{selectedDevice?.childName}</span>
              </h2>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      Latitude
                    </label>
                    <Input
                      type="number"
                      step="any"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      placeholder="e.g. 10.7626"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      Longitude
                    </label>
                    <Input
                      type="number"
                      step="any"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      placeholder="e.g. 106.6602"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Battery className="w-4 h-4 text-gray-400" />
                    Battery Percentage
                  </label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="range"
                      min="0"
                      max="100"
                      value={battery}
                      onChange={(e) => setBattery(e.target.value)}
                      className="flex-1"
                    />
                    <span className="w-12 text-center font-mono font-bold text-[#2563eb] bg-blue-50 px-2 py-1 rounded">
                      {battery}%
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    className="w-full bg-[#2563eb] hover:bg-[#1d4ed8]" 
                    onClick={handleUpdate}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating Status...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Update Device Status
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="mt-6 bg-amber-50 border border-amber-100 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  <strong>Warning:</strong> These changes are applied directly to the production database. 
                  This will trigger rule evaluations and notifications if the device moves outside its geofence or battery falls below thresholds.
                </p>
              </div>
            </Card>
          ) : (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
              <div className="bg-gray-50 p-4 rounded-full mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <p>Select a device from the left to debug</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
