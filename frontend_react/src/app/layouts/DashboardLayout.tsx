import { Outlet, useLocation, useNavigate } from 'react-router';
import { LayoutDashboard, Radio, Settings, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Badge } from '../components/ui/badge';
import { getDevices } from '../api/trackingApi';
import { ApiDeviceResponse } from '../types';

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [alertCount, setAlertCount] = useState(0);

  // Derive unread alert count from real device data
  useEffect(() => {
    const fetchAlertCount = async () => {
      try {
        const devices = await getDevices();
        let count = 0;
        for (const device of devices) {
          if (device.ruleStatus.isViolatingRule) count++;
          if (device.batteryPercent <= 50) count++;
          // Check if device is inactive (not updated in last 5 min)
          const updatedAt = new Date(device.updatedAtUtc).getTime();
          const fiveMinAgo = Date.now() - 5 * 60 * 1000;
          if (updatedAt < fiveMinAgo) count++;
        }
        setAlertCount(count);
      } catch {
        // Silently fail – layout should still render
      }
    };

    fetchAlertCount();
    const intervalId = setInterval(fetchAlertCount, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const navItems = [
    { path: '/app', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/app/pair-device', label: 'Pair Device', icon: Radio },
    { path: '/app/rule-manager', label: 'Rule Manager', icon: Settings },
    { path: '/app/notifications', label: 'Notifications', icon: Bell },
  ];

  const currentPath = location.pathname;
  const activeItem = navItems.find(item => 
    item.path === currentPath || (item.path === '/app' && currentPath === '/app')
  );

  const pageTitle = activeItem?.label || 'Dashboard';

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#2563eb] rounded-lg flex items-center justify-center">
              <span className="text-white">C</span>
            </div>
            <span className="text-lg">CLMS</span>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path || (item.path === '/app' && currentPath === '/app');
              
              return (
                <li key={item.path}>
                  <button
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-[#2563eb] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                    {item.label === 'Notifications' && alertCount > 0 && (
                      <Badge 
                        className={`ml-auto ${
                          isActive ? 'bg-white text-[#2563eb]' : 'bg-[#2563eb] text-white'
                        }`}
                      >
                        {alertCount}
                      </Badge>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <h1 className="text-xl">{pageTitle}</h1>
          
          <button 
            onClick={() => navigate('/app/notifications')}
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell className="w-6 h-6 text-gray-700" />
            {alertCount > 0 && (
              <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {alertCount}
              </span>
            )}
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}