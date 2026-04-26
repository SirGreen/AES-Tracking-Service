import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { Target, Rule } from '../types';
import { sortPointsForPolygon } from '../utils/polygonUtils';
import { formatScheduleTime } from '../utils/ruleScheduler';
import 'leaflet/dist/leaflet.css';

interface DashboardMapProps {
  targets: Target[];
  selectedTarget: Target | null;
  onTargetClick: (target: Target) => void;
  drawMode?: 'circle' | 'polygon' | null;
  onDrawComplete?: (rule: Partial<Rule>) => void;
  tempRule?: Partial<Rule> | null;
  searchedLocation?: { lat: number; lng: number; name: string } | null;
  viewingRules?: Rule[];
}

const createCustomIcon = (status: 'safe' | 'violation') => {
  const color = status === 'safe' ? '#22c55e' : '#ef4444';
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

export function DashboardMap({ 
  targets, 
  selectedTarget, 
  onTargetClick,
  drawMode,
  onDrawComplete,
  tempRule,
  searchedLocation,
  viewingRules = []
}: DashboardMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const shapesRef = useRef<Map<string, L.Polygon | L.Circle>>(new Map());
  const drawingMarkersRef = useRef<L.Marker[]>([]);
  const tempShapeRef = useRef<L.Circle | L.Polygon | null>(null);
  const polygonPointsRef = useRef<L.LatLng[]>([]);
  const onDrawCompleteRef = useRef(onDrawComplete);
  const searchMarkerRef = useRef<L.Marker | null>(null);
  const selectedShapeSignatureRef = useRef<string>('');

  // Keep onDrawComplete ref up to date
  useEffect(() => {
    onDrawCompleteRef.current = onDrawComplete;
  }, [onDrawComplete]);

  // Update polygon shape after points change
  const updatePolygonShape = useCallback(() => {
    if (!mapRef.current) return;

    if (tempShapeRef.current) {
      tempShapeRef.current.remove();
      tempShapeRef.current = null;
    }

    if (polygonPointsRef.current.length >= 2) {
      // Convert to array and sort points
      const unsortedPoints = polygonPointsRef.current.map(p => [p.lat, p.lng] as [number, number]);
      const sortedPoints = sortPointsForPolygon(unsortedPoints);
      
      tempShapeRef.current = L.polygon(sortedPoints, {
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.2,
        weight: 2,
        dashArray: '5, 5'
      }).addTo(mapRef.current);

      // Notify with sorted points
      if (onDrawCompleteRef.current) {
        onDrawCompleteRef.current({
          type: 'polygon',
          area: sortedPoints
        });
      }
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Set default view to Ho Chi Minh City (HCMUT Campus)
    mapRef.current = L.map(containerRef.current).setView([10.7732, 106.6597], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Handle drawing mode
  useEffect(() => {
    if (!mapRef.current || !drawMode) return;

    const map = mapRef.current;

    // Clear previous drawing
    drawingMarkersRef.current.forEach(marker => marker.remove());
    drawingMarkersRef.current = [];
    polygonPointsRef.current = [];
    if (tempShapeRef.current) {
      tempShapeRef.current.remove();
      tempShapeRef.current = null;
    }

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      if (drawMode === 'circle') {
        // For circle, just mark the center point
        const marker = L.marker([lat, lng], {
          icon: L.icon({
            iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiMzYjgyZjYiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4=',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          })
        }).addTo(map);

        drawingMarkersRef.current = [marker];
        
        if (onDrawCompleteRef.current) {
          onDrawCompleteRef.current({
            type: 'circle',
            center: [lat, lng],
            radius: 500 // Default radius 500m
          });
        }
      } else if (drawMode === 'polygon') {
        // For polygon, add point
        const markerIndex = drawingMarkersRef.current.length;
        
        const marker = L.marker([lat, lng], {
          icon: L.icon({
            iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iNCIgeT0iNCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiBmaWxsPSIjZWY0NDQ0IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
          draggable: true
        }).addTo(map);

        // Add popup with delete button
        const pointNumber = markerIndex + 1;
        marker.bindPopup(`
          <div style="text-align: center; padding: 4px;">
            <div style="font-size: 12px; margin-bottom: 6px; font-weight: 500;">Point ${pointNumber}</div>
            <button 
              id="delete-point-${markerIndex}" 
              style="
                background-color: #ef4444;
                color: white;
                border: none;
                padding: 4px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
              "
            >
              🗑️ Delete
            </button>
          </div>
        `);

        // Handle delete button click
        marker.on('popupopen', () => {
          const deleteBtn = document.getElementById(`delete-point-${markerIndex}`);
          if (deleteBtn) {
            deleteBtn.onclick = () => {
              // Remove marker
              marker.remove();
              
              // Remove from arrays
              const indexToRemove = drawingMarkersRef.current.indexOf(marker);
              if (indexToRemove > -1) {
                drawingMarkersRef.current.splice(indexToRemove, 1);
                polygonPointsRef.current.splice(indexToRemove, 1);
              }

              // Update polygon
              updatePolygonShape();

              // Close popup
              map.closePopup();
            };
          }
        });

        // Handle marker drag
        marker.on('drag', (e) => {
          const marker = e.target as L.Marker;
          const position = marker.getLatLng();
          const currentIndex = drawingMarkersRef.current.indexOf(marker);
          if (currentIndex > -1) {
            polygonPointsRef.current[currentIndex] = position;
            updatePolygonShape();
          }
        });

        marker.on('dragend', () => {
          updatePolygonShape();
        });

        drawingMarkersRef.current.push(marker);
        polygonPointsRef.current.push(e.latlng);

        // Update temp polygon
        updatePolygonShape();
      }
    };

    map.on('click', handleMapClick);

    // Change cursor
    map.getContainer().style.cursor = 'crosshair';

    return () => {
      map.off('click', handleMapClick);
      map.getContainer().style.cursor = '';
    };
  }, [drawMode, updatePolygonShape]);

  // Update temp shape when radius changes
  useEffect(() => {
    if (!mapRef.current || !tempRule || drawMode !== 'circle') return;

    if (tempShapeRef.current) {
      tempShapeRef.current.remove();
    }

    if (tempRule.center && tempRule.radius) {
      tempShapeRef.current = L.circle(tempRule.center as L.LatLngExpression, {
        radius: tempRule.radius,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.2,
        weight: 2,
        dashArray: '5, 5'
      }).addTo(mapRef.current);
    }
  }, [tempRule, drawMode]);

  // Clean up drawing when draw mode is disabled
  useEffect(() => {
    if (drawMode === null) {
      drawingMarkersRef.current.forEach(marker => marker.remove());
      drawingMarkersRef.current = [];
      polygonPointsRef.current = [];
      if (tempShapeRef.current) {
        tempShapeRef.current.remove();
        tempShapeRef.current = null;
      }
    }
  }, [drawMode]);

  // Update target markers only (separate from rule boundary rendering).
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    const incomingIds = new Set(targets.map(target => target.id));

    // Remove markers that no longer exist.
    markersRef.current.forEach((marker, targetId) => {
      if (!incomingIds.has(targetId)) {
        marker.remove();
        markersRef.current.delete(targetId);
      }
    });

    targets.forEach((target) => {
      const popupHtml = `
        <div class="p-2">
          <h3 class="font-semibold mb-1">${target.name}</h3>
          <p class="text-sm text-gray-600 mb-1">${target.deviceId}</p>
          <p class="text-sm">
            Status: <span class="${target.status === 'safe' ? 'text-green-600' : 'text-red-600'}">
              ${target.status === 'safe' ? 'Safe' : 'Violation'}
            </span>
          </p>
          <p class="text-sm">Battery: ${target.battery}%</p>
        </div>
      `;

      const existingMarker = markersRef.current.get(target.id);

      if (existingMarker) {
        existingMarker.setLatLng([target.latitude, target.longitude]);
        existingMarker.setIcon(createCustomIcon(target.status as 'safe' | 'violation'));
        existingMarker.setPopupContent(popupHtml);
      } else {
        const marker = L.marker([target.latitude, target.longitude], {
          icon: createCustomIcon(target.status as 'safe' | 'violation')
        }).addTo(map);

        marker.bindTooltip(target.name, {
          permanent: true,
          direction: 'top',
          offset: [0, -10],
          className: 'target-label',
          opacity: 0.9
        });

        marker.bindPopup(popupHtml);
        marker.on('click', () => onTargetClick(target));

        markersRef.current.set(target.id, marker);
      }
    });
  }, [targets, onTargetClick]);

  // Render selected target's active rule boundary with stable redraw rules.
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const selectedShapeKey = 'selected-active-rule';

    if (!selectedTarget?.id) {
      shapesRef.current.get(selectedShapeKey)?.remove();
      shapesRef.current.delete(selectedShapeKey);
      selectedShapeSignatureRef.current = '';
      return;
    }

    const selectedFromTargets = targets.find((target) => target.id === selectedTarget.id);
    if (!selectedFromTargets) {
      shapesRef.current.get(selectedShapeKey)?.remove();
      shapesRef.current.delete(selectedShapeKey);
      selectedShapeSignatureRef.current = '';
      return;
    }

    const activeRule = selectedFromTargets.rules.find((rule) => rule.id === selectedFromTargets.activeRuleId);
    if (!activeRule) {
      shapesRef.current.get(selectedShapeKey)?.remove();
      shapesRef.current.delete(selectedShapeKey);
      selectedShapeSignatureRef.current = '';
      return;
    }

    const geometrySignature = activeRule.type === 'circle'
      ? `${activeRule.center?.[0] ?? ''},${activeRule.center?.[1] ?? ''},${activeRule.radius ?? ''}`
      : JSON.stringify(activeRule.area ?? []);

    const nextSignature = `${selectedFromTargets.id}|${selectedFromTargets.status}|${activeRule.id}|${activeRule.type}|${geometrySignature}`;
    if (nextSignature === selectedShapeSignatureRef.current) {
      return;
    }

    shapesRef.current.get(selectedShapeKey)?.remove();

    const color = selectedFromTargets.status === 'violation' ? '#ef4444' : '#22c55e';
    const shapeOptions = {
      color,
      fillColor: color,
      fillOpacity: 0.2,
      weight: 2,
    };

    if (activeRule.type === 'polygon' && activeRule.area) {
      const polygon = L.polygon(activeRule.area as L.LatLngExpression[], shapeOptions).addTo(map);
      shapesRef.current.set(selectedShapeKey, polygon);
    } else if (activeRule.type === 'circle' && activeRule.center && activeRule.radius) {
      const circle = L.circle(activeRule.center as L.LatLngExpression, {
        ...shapeOptions,
        radius: activeRule.radius,
      }).addTo(map);
      shapesRef.current.set(selectedShapeKey, circle);
    }

    selectedShapeSignatureRef.current = nextSignature;
  }, [targets, selectedTarget?.id]);

  // Handle searched location separately
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Remove previous search marker
    if (searchMarkerRef.current) {
      searchMarkerRef.current.remove();
      searchMarkerRef.current = null;
    }

    // Add new search marker if exists
    if (searchedLocation) {
      const marker = L.marker([searchedLocation.lat, searchedLocation.lng], {
        icon: L.icon({
          iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJNMTYgNEMxMS4wMzcgNCAxIDkuMDM3IDEgMTRDMSAyMiAxNiAyOCAxNiAyOEMxNiAyOCAzMSAyMiAzMSAxNEMzMSA5LjAzNyAyMC45NjMgNCAxNiA0WiIgZmlsbD0iIzI1NjNlYiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgPGNpcmNsZSBjeD0iMTYiIGN5PSIxMyIgcj0iNCIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        })
      }).addTo(map);

      marker.bindPopup(`
        <div class="p-2">
          <div class="flex items-center gap-2 mb-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#2563eb"/>
              <circle cx="12" cy="9" r="2.5" fill="white"/>
            </svg>
            <span class="font-semibold text-[#2563eb]">Searched Location</span>
          </div>
          <p class="text-sm text-gray-600">${searchedLocation.name}</p>
        </div>
      `);

      searchMarkerRef.current = marker;
      marker.openPopup();
      map.setView([searchedLocation.lat, searchedLocation.lng], 16);
    }
  }, [searchedLocation]);

  // Display selected viewing rules on map.
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    Array.from(shapesRef.current.keys())
      .filter((key) => key.startsWith('viewing-rule-'))
      .forEach((key) => {
        shapesRef.current.get(key)?.remove();
        shapesRef.current.delete(key);
      });

    viewingRules.forEach((viewingRule) => {
      // Avoid duplicate overlays when the selected target already renders this rule as active.
      if (selectedTarget?.activeRuleId === viewingRule.id) {
        return;
      }

      const shapeOptions = {
        color: '#16a34a',
        fillColor: '#16a34a',
        fillOpacity: 0.3,
        weight: 3,
        dashArray: '10, 5',
      };

      if (viewingRule.type === 'polygon' && viewingRule.area) {
        const polygon = L.polygon(viewingRule.area as L.LatLngExpression[], shapeOptions).addTo(map);

        polygon.bindPopup(`
          <div class="p-2">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-lg">🔷</span>
              <span class="font-semibold text-green-600">Viewing Rule</span>
            </div>
            <p class="text-sm font-medium">${viewingRule.name}</p>
            <p class="text-xs text-gray-600 mt-1">⏰ ${formatScheduleTime(viewingRule.schedule)}</p>
          </div>
        `);

        shapesRef.current.set(`viewing-rule-${viewingRule.id}`, polygon);
      } else if (viewingRule.type === 'circle' && viewingRule.center && viewingRule.radius) {
        const circle = L.circle(viewingRule.center as L.LatLngExpression, {
          ...shapeOptions,
          radius: viewingRule.radius,
        }).addTo(map);

        circle.bindPopup(`
          <div class="p-2">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-lg">⭕</span>
              <span class="font-semibold text-green-600">Viewing Rule</span>
            </div>
            <p class="text-sm font-medium">${viewingRule.name}</p>
            <p class="text-xs text-gray-600 mt-1">📏 Radius: ${viewingRule.radius}m</p>
            <p class="text-xs text-gray-600">⏰ ${formatScheduleTime(viewingRule.schedule)}</p>
          </div>
        `);

        shapesRef.current.set(`viewing-rule-${viewingRule.id}`, circle);
      }
    });
  }, [viewingRules, selectedTarget?.activeRuleId]);

  // Auto-pan map to the selected target when its location changes
  useEffect(() => {
    // Make sure the map exists and we have valid coordinates (not 0,0)
    if (
      mapRef.current && 
      selectedTarget && 
      selectedTarget.latitude !== 0 && 
      selectedTarget.longitude !== 0
    ) {
      mapRef.current.flyTo(
        [selectedTarget.latitude, selectedTarget.longitude], 
        15, // Zoom level
        {
          animate: true,
          duration: 0.1 // Animation speed in seconds
        }
      );
    }
  }, [selectedTarget?.id]);

  return <div ref={containerRef} className="h-full w-full" />;
}