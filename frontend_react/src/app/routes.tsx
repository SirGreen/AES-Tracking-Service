import { createBrowserRouter, Navigate } from "react-router";
import Login from "./pages/Login";
import DashboardLayout from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import PairDevice from "./pages/PairDevice";
import RuleManager from "./pages/RuleManager";
import Notifications from "./pages/Notifications";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
    errorElement: <div className="p-8">Error loading login page</div>,
  },
  {
    path: "/app",
    element: <DashboardLayout />,
    errorElement: <div className="p-8">Error loading dashboard</div>,
    children: [
      {
        index: true,
        element: <Dashboard />,
        errorElement: <div className="p-8">Error loading dashboard content</div>,
      },
      {
        path: "pair-device",
        element: <PairDevice />,
        errorElement: <div className="p-8">Error loading pair device page</div>,
      },
      {
        path: "rule-manager",
        element: <RuleManager />,
        errorElement: <div className="p-8">Error loading rule manager page</div>,
      },
      {
        path: "notifications",
        element: <Notifications />,
        errorElement: <div className="p-8">Error loading notifications page</div>,
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);