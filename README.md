# CLMS — Children's Location Monitoring System

> **AES Group 4 · Advanced Software Engineering Project**
> A real-time GPS geofencing service for monitoring children's safety using IoT tracking devices.

Note: This is a code bundle for Children's Location Monitoring UI. The original project is available at [Children's Location Monitoring UI](https://www.figma.com/design/fqoPycxDigeNzRuRmtphCM/Children-s-Location-Monitoring-UI).

---

## 📖 Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Use Cases](#use-cases)
4. [Tech Stack](#tech-stack)
5. [Project Structure](#project-structure)
6. [Getting Started](#getting-started)
   - [Prerequisites](#prerequisites)
   - [Running the Backend (.NET API)](#running-the-backend-net-api)
   - [Running the Frontend (React)](#running-the-frontend-react)
7. [API Reference](#api-reference)
8. [Key Design Decisions](#key-design-decisions)
9. [Known Limitations](#known-limitations)

---

## Overview

CLMS is a **two-tier web application** that lets parents or guardians monitor the real-time location of children via GPS-enabled wearable devices. Parents can draw **geofence rules** (circle or polygon zones) tied to specific time windows, and the system automatically evaluates whether a device is inside or outside the allowed zone every time its location is updated.

Core capabilities:
- Register and pair GPS tracking devices to children's profiles
- Draw circle or polygon geofence rules per child with time schedules
- Real-time violation detection on every location push
- Interactive Leaflet map dashboard with live status badges
- Violation log with a 5-minute deduplication window

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend (Vite)                   │
│  ┌────────────┐ ┌─────────────┐ ┌───────────┐ ┌──────────┐  │
│  │  Dashboard │ │ RuleManager │ │PairDevice │ │  Notifs  │  │
│  └──────┬─────┘ └──────┬──────┘ └─────┬─────┘ └────┬─────┘  │
│         └──────────────┴──────────────┴────────────┘        │
│                        trackingApi.ts (fetch)               │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP/JSON  (CORS: localhost:5173)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               ASP.NET Core 8 Web API  (port 5282)           │
│                                                             │
│  ┌──────────────────┐      ┌──────────────────────────────┐ │
│  │ DevicesController│      │     RulesController          │ │
│  │  GET  /devices   │      │  GET  /rules                 │ │
│  │  POST /devices   │      │  POST /rules                 │ │
│  │  PUT  /devices   │      │  PUT  /rules/{id}            │ │
│  │  PATCH /location │      │  DELETE /rules/{id}          │ │
│  │  DELETE/devices  │      └──────────────────────────────┘ │
│  │  POST /pair      │                                       │
│  └────────┬─────────┘                                       │
│           │                                                 │
│  ┌────────▼──────────────────────────────────────────────┐  │
│  │           IRuleEvaluationService                      │  │
│  │  • ValidateRuleAsync  — overlapping time check        │  │
│  │  • EvaluateDeviceAsync — Haversine / Ray-casting      │  │
│  │  • SaveViolationLogAsync — 5-min dedup guard          │  │
│  └────────┬──────────────────────────────────────────────┘  │
│           │                                                 │
│  ┌────────▼──────────────────────────────────────────────┐  │
│  │              AppDbContext (EF Core + SQLite)          │  │
│  │   Devices ──< ViolationLogs >── Rules                 │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                     childtracking.db
                     (SQLite file, local disk)
```

### Data Model

| Entity         | Key Fields                                                                                 |
|----------------|--------------------------------------------------------------------------------------------|
| **Device**     | `Id`, `DeviceIdentifier` (unique), `ChildName`, `BatteryPercent`, `Latitude`, `Longitude` |
| **Rule**       | `Id`, `Name`, `ChildName`, `RuleType` (Circle/Polygon), `StartTime`, `EndTime`, geofence fields |
| **ViolationLog** | `Id`, `DeviceId` (FK), `RuleId` (FK), `ChildName`, `IsViolation`, `Message`, `CheckedAtUtc` |

Devices and Rules are linked **by child name** (a soft foreign key). ViolationLogs reference both Devices and Rules through hard FK constraints with cascade-delete.

---

## Use Cases

### UC-1: Register a New Tracking Device
A parent registers a device by providing its unique hardware identifier. The system creates a `Device` record and validates that no duplicate identifier exists.

### UC-2: Pair a Device to a Child
Using the **Pair Device** endpoint (`POST /api/devices/pair`), a device is associated with a child's name. If the device identifier doesn't exist yet, it is automatically created (upsert behaviour).

### UC-3: Push a Location Update
An IoT device (or simulated client) calls `PATCH /api/devices/{id}/location` with latitude/longitude and optional battery level. The backend immediately evaluates whether the device is inside its active geofence rule and returns the violation status.

### UC-4: Create a Geofence Rule
A parent draws a zone on the map in the **Rule Manager** page:
- **Circle rule** — selects a center point and radius (50 – 5000 m).
- **Polygon rule** — draws at least 3 vertices on the map.
- Sets a time window (e.g., 08:00 – 17:00). The backend validates there is no overlapping rule for the same child in that time range.

### UC-5: Monitor the Dashboard
The **Dashboard** polls the API every 5 seconds. Each device card shows:
- Child name and device identifier
- Battery percentage with colour-coded icon
- "Safe" or "Violation" status badge
- Active rule name if one is currently enforced
- Device position pin on the Leaflet map

### UC-6: View and Manage Rules
The **Rule Manager** lists all rules grouped by target child. Operators can:
- Preview a rule's zone on the map (View / Hide)
- Toggle the enabled state (UI-only, not persisted to backend)
- Delete a rule (calls `DELETE /api/rules/{id}`)

### UC-7: Receive Notifications
The **Notifications** page displays alert cards for rule violations, low battery, and connection-lost events. (Currently populated from mock data; backend `ViolationLog` integration is a planned enhancement.)

---

## Tech Stack

### Backend
| Component       | Choice                          |
|-----------------|---------------------------------|
| Framework       | ASP.NET Core 8 (Minimal Host)   |
| ORM             | Entity Framework Core 8         |
| Database        | SQLite (`childtracking.db`)     |
| Serialisation   | System.Text.Json (enum strings) |
| API Docs        | Swagger / OpenAPI (dev only)    |

### Frontend
| Component       | Choice                                    |
|-----------------|-------------------------------------------|
| Framework       | React 18 + TypeScript (Vite 6)            |
| Routing         | React Router v7                           |
| Map             | Leaflet + react-leaflet                   |
| UI Components   | Radix UI primitives + shadcn/ui           |
| Styling         | Tailwind CSS v4                           |
| Toast           | Sonner                                    |
| Geocoding       | Nominatim (OpenStreetMap, free)           |

---

## Project Structure

```
AES-Tracking-Service/
├── BTL-AES.sln
├── BTL-AES.csproj           # .NET 8 project file
├── Program.cs               # App bootstrap, DI, middleware
├── appsettings.json         # SQLite connection string
│
├── Controllers/
│   ├── DevicesController.cs # CRUD + pair + location patch
│   └── RulesController.cs   # CRUD for geofence rules
│
├── Services/
│   ├── IRuleEvaluationService.cs
│   └── RuleEvaluationService.cs  # Haversine & ray-casting logic
│
├── Models/
│   ├── Device.cs
│   ├── Rule.cs
│   ├── ViolationLog.cs
│   ├── GeoPoint.cs
│   └── Enums/RuleType.cs
│
├── Dtos/
│   ├── DeviceDtos.cs        # Request/Response DTOs for devices
│   └── RuleDtos.cs          # Request/Response DTOs for rules
│
├── Data/
│   └── AppDbContext.cs      # EF Core DbContext + model config
│
└── frontend_react/
    ├── package.json
    ├── vite.config.ts
    └── src/app/
        ├── routes.tsx
        ├── api/
        │   └── trackingApi.ts   # fetch wrappers for the .NET API
        ├── pages/
        │   ├── Login.tsx
        │   ├── Dashboard.tsx    # Live map + device list (polls every 5s)
        │   ├── RuleManager.tsx  # Rule creation + management
        │   ├── PairDevice.tsx   # Device pairing (partially mock)
        │   └── Notifications.tsx # Alert centre (mock data)
        ├── components/
        │   └── DashboardMap.tsx # react-leaflet map with draw tools
        ├── types/               # Shared TypeScript type definitions
        └── utils/               # Geofencing & scheduling helpers
```

---

## Getting Started

### Prerequisites

| Tool         | Version  | Notes                              |
|--------------|----------|------------------------------------|
| .NET SDK     | 8.0+     | `dotnet --version` to verify       |
| Node.js      | 18+      | `node --version` to verify         |
| npm / pnpm   | any      | Used to install frontend deps      |

### Running the code (old version)

Run `npm i` to install the dependencies.

Run `npm run dev` to start the development server.

### Running the Backend (.NET API)

```powershell
# From the repo root (AES-Tracking-Service/)
dotnet run
```

The API starts on **http://localhost:5282** (or https://localhost:7282).  
Swagger UI is available at **http://localhost:5282/swagger** in development mode.  
The SQLite database file `childtracking.db` is created automatically on first run.

> **Tip:** To change the port, edit `Properties/launchSettings.json`.

### Running the Frontend (React)

```powershell
# From the frontend directory
cd frontend_react

# Install dependencies (first time only)
npm install

# Start the dev server
npm run dev
```

The app will be available at **http://localhost:5173**.

> **Important:** The API URL is hardcoded to `http://localhost:5282/api` in  
> `src/app/api/trackingApi.ts`. If your backend runs on a different port, update that constant.

### Quick-Start Workflow

1. Start the backend (`dotnet run`)
2. Start the frontend (`npm run dev`)
3. Open **http://localhost:5173**
4. Click **Login** (no credentials required — login is bypassed)
5. Go to **Pair Device** to register a device and child name  
   *(or use the Swagger UI to POST to `/api/devices/pair`)*
6. Use the Swagger UI or a REST client (e.g., `BTL-AES.http`) to push a location:
   ```http
   PATCH http://localhost:5282/api/devices/1/location
   Content-Type: application/json

   { "latitude": 10.7769, "longitude": 106.7009 }
   ```
7. Go to **Rule Manager** → select the target → draw a circle or polygon zone → set times → save
8. The **Dashboard** will update within 5 seconds showing "Safe" or "Violation"

---

## API Reference

### Devices

| Method  | Route                          | Description                                     |
|---------|--------------------------------|-------------------------------------------------|
| `GET`   | `/api/devices`                 | List all devices with current rule status       |
| `GET`   | `/api/devices/{id}`            | Get a single device                             |
| `POST`  | `/api/devices`                 | Create a new device                             |
| `POST`  | `/api/devices/pair`            | Upsert device + assign child name               |
| `PUT`   | `/api/devices/{id}`            | Full update of a device                         |
| `PATCH` | `/api/devices/{id}/location`   | Push a new GPS coordinate (triggers evaluation) |
| `DELETE`| `/api/devices/{id}`            | Delete a device (cascades ViolationLogs)        |

### Rules

| Method  | Route            | Description                                              |
|---------|------------------|----------------------------------------------------------|
| `GET`   | `/api/rules`     | List all rules (optional `?childName=` filter)           |
| `GET`   | `/api/rules/{id}`| Get a single rule                                        |
| `POST`  | `/api/rules`     | Create a new rule (validates overlap + coordinates)      |
| `PUT`   | `/api/rules/{id}`| Update a rule                                            |
| `DELETE`| `/api/rules/{id}`| Delete a rule (cascades ViolationLogs)                   |

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **SQLite over PostgreSQL** | Zero-config local development; EF Core migrations can switch to Postgres for production with a one-line change. |
| **Child name as soft FK** | Devices and Rules are linked by `ChildName` string rather than a `ChildId`, keeping the data model simple for an academic prototype. |
| **Rule evaluation on every read** | The `EvaluateDeviceAsync` method is called inside every `GET /devices` and location update response. This is simple but does not scale to many devices — a background job or WebSocket push would be used in production. |
| **5-minute violation dedup** | `SaveViolationLogAsync` suppresses duplicate logs within 5 minutes to avoid flooding the log table during polling. |
| **UTC timestamps throughout** | All `DateTime` fields use `DateTime.UtcNow` to avoid timezone ambiguity, especially important for rules using `TimeOnly`. |
| **Haversine for circles** | Accurate great-circle distance using the Haversine formula (`earthRadius = 6,371,000 m`). |
| **Ray-casting for polygons** | Standard point-in-polygon algorithm using longitude as the scan axis. A tiny `double.Epsilon` guard prevents division by zero on horizontal edges. |

---

## Known Limitations

- **No authentication** — The login page bypasses credential checks. Any security is on the honour system.
- **PairDevice page is partially mocked** — It does not call the backend; device list comes from `mockData.ts`.
- **Notifications page is fully mocked** — Violation logs exist in the database but are not exposed via API or fetched by the frontend.
- **Rules are time-of-day only (no day-of-week)** — Schedules apply every day; there is no weekly recurrence.
- **`toggleRuleEnabled` is UI-only** — Disabling a rule in the UI does not persist to the backend. The backend always evaluates all rules whose time window matches `DateTime.UtcNow`.
- **`setActiveRule` is UI-only** — Manually activating a rule in the Rule Manager panel does not affect backend evaluation.
- **CORS is locked to localhost:5173** — Deploying the frontend to any other origin requires updating `Program.cs`.