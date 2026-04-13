import { useState } from 'react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Battery, BatteryWarning, WifiOff, AlertTriangle } from 'lucide-react';
import { mockNotifications } from '../data/mockData';
import { Notification } from '../types';
import { formatDistanceToNow } from 'date-fns';

export default function Notifications() {
  const [notifications] = useState<Notification[]>(mockNotifications);

  const getNotificationIcon = (type: Notification['type']) => {
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

  const getNotificationColor = (type: Notification['type']) => {
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

  const getTypeLabel = (type: Notification['type']) => {
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

  const renderNotificationList = (items: Notification[]) => (
    <div className="space-y-3">
      {items.map((notification) => (
        <Card
          key={notification.id}
          className={`p-4 border-l-4 ${getNotificationColor(notification.type)} ${
            !notification.read ? 'bg-blue-50' : ''
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
                </div>
                {!notification.read && (
                  <div className="w-2 h-2 bg-[#2563eb] rounded-full" />
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
      <div className="mb-6">
        <h2 className="text-lg mb-2">Notification Center</h2>
        <p className="text-sm text-gray-600">
          View all system alerts and notifications
        </p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="all">
            All ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts Only ({alertNotifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread ({notifications.filter(n => !n.read).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {renderNotificationList(notifications)}
        </TabsContent>

        <TabsContent value="alerts">
          {renderNotificationList(alertNotifications)}
        </TabsContent>

        <TabsContent value="unread">
          {renderNotificationList(notifications.filter(n => !n.read))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
