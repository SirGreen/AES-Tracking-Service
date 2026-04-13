// Calculate centroid of points
export function getCentroid(points: Array<[number, number]>): [number, number] {
  if (points.length === 0) return [0, 0];
  
  const sum = points.reduce(
    (acc, point) => [acc[0] + point[0], acc[1] + point[1]],
    [0, 0]
  );
  
  return [sum[0] / points.length, sum[1] / points.length];
}

// Calculate angle from centroid to point
function getAngle(centroid: [number, number], point: [number, number]): number {
  return Math.atan2(point[1] - centroid[1], point[0] - centroid[0]);
}

// Sort points to form a proper polygon (clockwise from centroid)
export function sortPointsForPolygon(points: Array<[number, number]>): Array<[number, number]> {
  if (points.length < 3) return points;
  
  const centroid = getCentroid(points);
  
  // Sort points by angle from centroid
  const sorted = [...points].sort((a, b) => {
    const angleA = getAngle(centroid, a);
    const angleB = getAngle(centroid, b);
    return angleA - angleB;
  });
  
  return sorted;
}

// Calculate area of polygon (for validation)
export function getPolygonArea(points: Array<[number, number]>): number {
  if (points.length < 3) return 0;
  
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i][0] * points[j][1];
    area -= points[j][0] * points[i][1];
  }
  
  return Math.abs(area / 2);
}
