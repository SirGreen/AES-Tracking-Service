import { useState } from 'react';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Battery, BatteryLow, BatteryWarning, WifiOff, Pencil, Check, X } from 'lucide-react';
import { mockDevices } from '../data/mockData';
import { Device } from '../types';
import { toast } from 'sonner';

export default function PairDevice() {
  const [devices, setDevices] = useState<Device[]>(mockDevices);
  const [deviceId, setDeviceId] = useState('');
  const [childName, setChildName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAddDevice = () => {
    if (!deviceId.trim() || !childName.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    const newDevice: Device = {
      id: Date.now().toString(),
      deviceId: deviceId.trim(),
      childName: childName.trim(),
      battery: 100,
      connected: true,
    };

    setDevices([...devices, newDevice]);
    setDeviceId('');
    setChildName('');
    toast.success(`Device ${deviceId} paired successfully!`);
  };

  const startEditing = (device: Device) => {
    setEditingId(device.id);
    setEditingName(device.childName);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const saveEditing = (deviceId: string) => {
    if (!editingName.trim()) {
      toast.error('Child name cannot be empty');
      return;
    }

    setDevices(devices.map(d => 
      d.id === deviceId ? { ...d, childName: editingName.trim() } : d
    ));
    
    toast.success('Child name updated successfully!');
    setEditingId(null);
    setEditingName('');
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Add Device Form */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg mb-4">Add New Device</h2>
        
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm mb-2 text-gray-700">Device ID</label>
            <Input
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="DEV-001"
              className="w-full"
            />
          </div>
          
          <div className="flex-1">
            <label className="block text-sm mb-2 text-gray-700">Child Name</label>
            <Input
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder="Enter child's name"
              className="w-full"
            />
          </div>
          
          <Button
            onClick={handleAddDevice}
            className="bg-[#2563eb] hover:bg-[#1d4ed8]"
          >
            Add Device
          </Button>
        </div>
      </Card>

      {/* Device List */}
      <div>
        <h2 className="text-lg mb-4">Paired Devices ({devices.length})</h2>
        
        <div className="grid gap-4">
          {devices.map((device) => (
            <Card key={device.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Device ID</p>
                    <p className="font-mono">{device.deviceId}</p>
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
                            if (e.key === 'Enter') saveEditing(device.id);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => saveEditing(device.id)}
                          className="bg-green-600 hover:bg-green-700 h-8 w-8 p-0"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={cancelEditing}
                          variant="outline"
                          className="h-8 w-8 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{device.childName}</p>
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
                    <span className={getBatteryColor(device.battery)}>
                      {getBatteryIcon(device.battery)}
                    </span>
                    <div>
                      <p className="text-sm text-gray-500">Battery</p>
                      <p>{device.battery}%</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {!device.connected && (
                    <div className="flex items-center gap-2 text-orange-500">
                      <WifiOff className="w-5 h-5" />
                      <span className="text-sm">Lost Connection</span>
                    </div>
                  )}
                  
                  <Badge
                    className={
                      device.connected
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-gray-500 hover:bg-gray-600'
                    }
                  >
                    {device.connected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}