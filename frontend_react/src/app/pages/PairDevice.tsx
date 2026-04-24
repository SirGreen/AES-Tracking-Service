import { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Battery, BatteryLow, BatteryWarning, WifiOff,
  Pencil, Check, X, Trash2, Loader2, RefreshCw
} from 'lucide-react';
import { ApiDeviceResponse } from '../types';
import { toast } from 'sonner';
import { getDevices, pairDevice, updateDevice, deleteDevice } from '../api/trackingApi';

export default function PairDevice() {
  const [devices, setDevices] = useState<ApiDeviceResponse[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [childName, setChildName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Fetch devices from backend on mount
  const fetchDevices = async () => {
    try {
      const data = await getDevices();
      setDevices(data);
    } catch (error) {
      console.error('Failed to fetch devices:', error);
      toast.error('Failed to connect to the tracking server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  // POST /api/devices/pair
  const handleAddDevice = async () => {
    if (!deviceId.trim() || !childName.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsAdding(true);

    try {
      const newDevice = await pairDevice({
        deviceIdentifier: deviceId.trim(),
        childName: childName.trim(),
        batteryPercent: 100,
        latitude: null,
        longitude: null,
      });

      setDevices(prev => [...prev, newDevice]);
      setDeviceId('');
      setChildName('');
      toast.success(`Device "${newDevice.deviceIdentifier}" paired successfully!`);
    } catch (error: any) {
      console.error('Failed to pair device:', error);
      toast.error(error.message || 'Failed to pair device');
    } finally {
      setIsAdding(false);
    }
  };

  const startEditing = (device: ApiDeviceResponse) => {
    setEditingId(device.id);
    setEditingName(device.childName || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  // PUT /api/devices/{id}
  const saveEditing = async (device: ApiDeviceResponse) => {
    if (!editingName.trim()) {
      toast.error('Child name cannot be empty');
      return;
    }

    setSavingId(device.id);

    try {
      const updated = await updateDevice(device.id, {
        deviceIdentifier: device.deviceIdentifier,
        childName: editingName.trim(),
        batteryPercent: device.batteryPercent,
        latitude: device.latitude,
        longitude: device.longitude,
      });

      setDevices(prev => prev.map(d => (d.id === device.id ? updated : d)));
      toast.success('Child name updated successfully!');
      setEditingId(null);
      setEditingName('');
    } catch (error: any) {
      console.error('Failed to update device:', error);
      toast.error(error.message || 'Failed to update device');
    } finally {
      setSavingId(null);
    }
  };

  // DELETE /api/devices/{id}
  const handleDeleteDevice = async (device: ApiDeviceResponse) => {
    setDeletingId(device.id);

    try {
      await deleteDevice(device.id);
      setDevices(prev => prev.filter(d => d.id !== device.id));
      toast.success(`Device "${device.deviceIdentifier}" removed`);
    } catch (error: any) {
      console.error('Failed to delete device:', error);
      toast.error(error.message || 'Failed to delete device');
    } finally {
      setDeletingId(null);
    }
  };

  const getBatteryIcon = (battery: number) => {
    if (battery > 50) return <Battery className="w-5 h-5" />;
    if (battery > 20) return <BatteryWarning className="w-5 h-5" />;
    return <BatteryLow className="w-5 h-5" />;
  };

  const getBatteryColor = (battery: number) => {
    if (battery > 50) return 'text-green-600';
    if (battery > 20) return 'text-orange-500';
    return 'text-red-600';
  };

  // Device is "connected" if it was updated recently (within last 5 minutes)
  const isConnected = (device: ApiDeviceResponse) => {
    const updatedAt = new Date(device.updatedAtUtc).getTime();
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    return updatedAt > fiveMinAgo;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Add Device Form */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg mb-4">Pair New Device</h2>
        
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm mb-2 text-gray-700">Device Identifier</label>
            <Input
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="e.g. dev-001"
              className="w-full"
              disabled={isAdding}
            />
          </div>
          
          <div className="flex-1">
            <label className="block text-sm mb-2 text-gray-700">Child Name</label>
            <Input
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder="Enter child's name"
              className="w-full"
              disabled={isAdding}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddDevice();
              }}
            />
          </div>
          
          <Button
            onClick={handleAddDevice}
            className="bg-[#2563eb] hover:bg-[#1d4ed8]"
            disabled={isAdding}
          >
            {isAdding ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Pairing...
              </>
            ) : (
              'Pair Device'
            )}
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-3">
          💡 Sends a <code className="bg-gray-100 px-1 rounded">POST</code> to{' '}
          <code className="bg-gray-100 px-1 rounded">/api/devices/pair</code> — creates the device if new, or updates it if the identifier already exists.
        </p>
      </Card>

      {/* Device List Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg">
          Paired Devices ({devices.length})
        </h2>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setIsLoading(true);
            fetchDevices();
          }}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && devices.length === 0 && (
        <Card className="p-12 text-center text-gray-500">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-[#2563eb]" />
          <p>Loading devices from server...</p>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && devices.length === 0 && (
        <Card className="p-12 text-center text-gray-500">
          <p className="text-lg mb-2">No devices paired yet</p>
          <p className="text-sm">Use the form above to pair your first device</p>
        </Card>
      )}

      {/* Device List */}
      <div className="grid gap-4">
        {devices.map((device) => {
          const connected = isConnected(device);

          return (
            <Card key={device.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Device ID</p>
                    <p className="font-mono">{device.deviceIdentifier}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Child Name</p>
                    {editingId === device.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          placeholder="Enter child's name"
                          className="w-40"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditing(device);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          autoFocus
                          disabled={savingId === device.id}
                        />
                        <Button
                          size="sm"
                          onClick={() => saveEditing(device)}
                          className="bg-green-600 hover:bg-green-700 h-8 w-8 p-0"
                          disabled={savingId === device.id}
                        >
                          {savingId === device.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={cancelEditing}
                          variant="outline"
                          className="h-8 w-8 p-0"
                          disabled={savingId === device.id}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{device.childName || '—'}</p>
                        <Button
                          size="sm"
                          onClick={() => startEditing(device)}
                          variant="ghost"
                          className="h-7 w-7 p-0 text-gray-500 hover:text-[#2563eb]"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={getBatteryColor(device.batteryPercent)}>
                      {getBatteryIcon(device.batteryPercent)}
                    </span>
                    <div>
                      <p className="text-sm text-gray-500">Battery</p>
                      <p>{device.batteryPercent}%</p>
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="text-xs font-mono">
                      {device.latitude != null && device.longitude != null
                        ? `${device.latitude.toFixed(4)}, ${device.longitude.toFixed(4)}`
                        : 'No location'}
                    </p>
                  </div>

                  {/* Rule Status */}
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className={`text-xs px-2 py-0.5 rounded inline-block ${
                      device.ruleStatus.isViolatingRule
                        ? 'bg-red-100 text-red-700'
                        : device.ruleStatus.hasActiveRule
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {device.ruleStatus.message || 'No active rule'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {!connected && (
                    <div className="flex items-center gap-2 text-orange-500">
                      <WifiOff className="w-5 h-5" />
                      <span className="text-sm">Inactive</span>
                    </div>
                  )}
                  
                  <Badge
                    className={
                      connected
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-gray-500 hover:bg-gray-600'
                    }
                  >
                    {connected ? 'Active' : 'Inactive'}
                  </Badge>

                  {/* Delete Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteDevice(device)}
                    className="text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                    title="Remove device"
                    disabled={deletingId === device.id}
                  >
                    {deletingId === device.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}