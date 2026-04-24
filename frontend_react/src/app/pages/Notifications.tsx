import { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Battery, BatteryWarning, WifiOff, AlertTriangle,
  Loader2, RefreshCw, CheckCheck
} from 'lucide-react';
import { ApiDeviceResponse } from '../types';
import { getDevices } from '../api/trackingApi';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

// Notification derived from real device data
interface DerivedNotification {
  id: string;
  type: 'low-battery' | 'critical-battery' | 'lost-connection' | 'rule-violation';
  targetName: string;
  deviceIdentifier: string;
  timestamp: Date;
  message: string;
  read: boolean;
}

/**
 * Builds notification entries from real device API data.
 * Checks battery levels, connectivity, and rule violations.
 */
function deriveNotifications(devices: ApiDeviceResponse[]): DerivedNotification[] {
  const notifications: DerivedNotification[] = [];

  for (const device of devices) {
    const name = device.childName || device.deviceIdentifier;
    const updatedAt = new Date(device.updatedAtUtc);
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const isConnected = updatedAt.getTime() > fiveMinAgo;

    // Rule violation
    if (device.ruleStatus.isViolatingRule) {
      notifications.push({
        id: `violation-${device.id}`,
        type: 'rule-violation',
        targetName: name,
        deviceIdentifier: device.deviceIdentifier,
        timestamp: updatedAt,
        message: device.ruleStatus.message || `${name} is outside the geofence boundary`,
        read: false,
      });
    }

    // Critical battery (≤ 15%)
    if (device.batteryPercent <= 15) {
      notifications.push({
        id: `crit-bat-${device.id}`,
        type: 'critical-battery',
        targetName: name,
        deviceIdentifier: device.deviceIdentifier,
        timestamp: updatedAt,
        message: `Device battery is critically low (${device.batteryPercent}%)`,
        read: false,
      });
    }
    // Low battery (≤ 50% but > 15%)
    else if (device.batteryPercent <= 50) {
      notifications.push({
        id: `low-bat-${device.id}`,
        type: 'low-battery',
        targetName: name,
        deviceIdentifier: device.deviceIdentifier,
        timestamp: updatedAt,
        message: `Device battery is below 50% (${device.batteryPercent}%)`,
        read: false,
      });
    }

    // Lost connection
    if (!isConnected) {
      notifications.push({
        id: `lost-conn-${device.id}`,
        type: 'lost-connection',
        targetName: name,
        deviceIdentifier: device.deviceIdentifier,
        timestamp: updatedAt,
        message: `Lost connection with device ${device.deviceIdentifier}`,
        read: false,
      });
    }
  }

  // Sort: most recent first
  notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return notifications;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<DerivedNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const devices = await getDevices();
      const derived = deriveNotifications(devices);
      setNotifications(derived);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Failed to fetch device data for notifications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Poll every 10 seconds
    const intervalId = setInterval(fetchNotifications, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const markAsRead = (id: string) => {
    setReadIds(prev => new Set(prev).add(id));
  };

  const markAllAsRead = () => {
    const allIds = new Set(notifications.map(n => n.id));
    setReadIds(allIds);
    toast.success('All notifications marked as read');
  };

  const isRead = (id: string) => readIds.has(id);

  const getNotificationIcon = (type: DerivedNotification['type']) => {
    switch (type) {
      case 'low-battery':
        return <BatteryWarning className="w-5 h-5 text-orange-500" />;
      case 'critical-battery':
        return <Battery className="w-5 h-5 text-red-500" />;
      case 'lost-connection':
        return <WifiOff className="w-5 h-5 text-orange-500" />;
      case 'rule-violation':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
    }
  };

  const getNotificationColor = (type: DerivedNotification['type']) => {
    switch (type) {
      case 'low-battery':
        return 'border-l-orange-500';
      case 'critical-battery':
        return 'border-l-red-500';
      case 'lost-connection':
        return 'border-l-orange-500';
      case 'rule-violation':
        return 'border-l-red-500';
    }
  };

  const getTypeLabel = (type: DerivedNotification['type']) => {
    switch (type) {
      case 'low-battery':
        return 'Low Battery';
      case 'critical-battery':
        return 'Critical Battery';
      case 'lost-connection':
        return 'Connection Lost';
      case 'rule-violation':
        return 'Rule Violation';
    }
  };

  const alertNotifications = notifications.filter(
    n => n.type === 'rule-violation' || n.type === 'critical-battery' || n.type === 'lost-connection'
  );

  const unreadNotifications = notifications.filter(n => !isRead(n.id));

  const renderNotificationList = (items: DerivedNotification[]) => (
    <div className="space-y-3">
      {items.map((notification) => (
        <Card
          key={notification.id}
          onClick={() => markAsRead(notification.id)}
          className={`p-4 border-l-4 cursor-pointer transition-colors ${getNotificationColor(notification.type)} ${
            !isRead(notification.id) ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="mt-1">{getNotificationIcon(notification.type)}</div>
            
            <div className="flex-1">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{notification.targetName}</h3>
                    <Badge variant="outline" className="text-xs">
                      {getTypeLabel(notification.type)}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{notification.message}</p>
                  <p className="text-xs text-gray-400 mt-1 font-mono">
                    Device: {notification.deviceIdentifier}
                  </p>
                </div>
                {!isRead(notification.id) && (
                  <div className="w-2 h-2 bg-[#2563eb] rounded-full flex-shrink-0 mt-2" />
                )}
              </div>
              
              <p className="text-xs text-gray-500 mt-2">
                {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
              </p>
            </div>
          </div>
        </Card>
      ))}
      
      {items.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No notifications to display</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg mb-2">Notification Center</h2>
          <p className="text-sm text-gray-600">
            Real-time alerts derived from device data via <code className="bg-gray-100 px-1 rounded text-xs">GET /api/devices</code>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={markAllAsRead}
            disabled={unreadNotifications.length === 0}
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark all read
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchNotifications}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && notifications.length === 0 && (
        <Card className="p-12 text-center text-gray-500">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-[#2563eb]" />
          <p>Fetching notifications...</p>
        </Card>
      )}

      {!isLoading && (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="all">
              All ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="alerts">
              Alerts Only ({alertNotifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread ({unreadNotifications.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            {renderNotificationList(notifications)}
          </TabsContent>

          <TabsContent value="alerts">
            {renderNotificationList(alertNotifications)}
          </TabsContent>

          <TabsContent value="unread">
            {renderNotificationList(unreadNotifications)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
