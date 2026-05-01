(function exposeShapeGenerators() {
  const DEFAULT_BOX = { width: 1000, height: 300 };

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function sampleLine(x1, y1, x2, y2, n) {
    const points = [];
    const steps = Math.max(2, n);
    for (let i = 0; i < steps; i += 1) {
      const t = steps === 1 ? 0 : i / (steps - 1);
      points.push({ x: lerp(x1, x2, t), y: lerp(y1, y2, t) });
    }
    return points;
  }

  function sampleQuadraticBezier(p0, p1, p2, n) {
    const points = [];
    const steps = Math.max(2, n);
    for (let i = 0; i < steps; i += 1) {
      const t = i / (steps - 1);
      const mt = 1 - t;
      points.push({
        x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
        y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
      });
    }
    return points;
  }

  function sampleCubicBezier(p0, p1, p2, p3, n) {
    const points = [];
    const steps = Math.max(2, n);
    for (let i = 0; i < steps; i += 1) {
      const t = i / (steps - 1);
      const mt = 1 - t;
      points.push({
        x:
          mt * mt * mt * p0.x +
          3 * mt * mt * t * p1.x +
          3 * mt * t * t * p2.x +
          t * t * t * p3.x,
        y:
          mt * mt * mt * p0.y +
          3 * mt * mt * t * p1.y +
          3 * mt * t * t * p2.y +
          t * t * t * p3.y
      });
    }
    return points;
  }

  function samplePolyline(points, n) {
    if (points.length < 2) return points.slice();
    const lengths = [];
    let total = 0;
    for (let i = 1; i < points.length; i += 1) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      const length = Math.hypot(dx, dy);
      lengths.push(length);
      total += length;
    }

    const out = [];
    const steps = Math.max(2, n);
    for (let i = 0; i < steps; i += 1) {
      let distance = (i / (steps - 1)) * total;
      for (let segment = 0; segment < lengths.length; segment += 1) {
        if (distance <= lengths[segment] || segment === lengths.length - 1) {
          const ratio = lengths[segment] === 0 ? 0 : distance / lengths[segment];
          out.push({
            x: lerp(points[segment].x, points[segment + 1].x, ratio),
            y: lerp(points[segment].y, points[segment + 1].y, ratio)
          });
          break;
        }
        distance -= lengths[segment];
      }
    }
    return out;
  }

  function normalizePoints(points) {
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));
    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);
    return points.map((point) => ({
      x: (point.x - minX) / width,
      y: (point.y - minY) / height
    }));
  }

  function scaleAndCenterPoints(points, bounds) {
    const box = bounds || DEFAULT_BOX;
    const normalized = normalizePoints(points);
    const padding = box.padding || 0;
    const usableWidth = box.width - padding * 2;
    const usableHeight = box.height - padding * 2;
    return normalized.map((point) => ({
      x: padding + point.x * usableWidth,
      y: padding + point.y * usableHeight
    }));
  }

  function takeDistributed(points, count) {
    if (points.length === count) return points;
    if (!points.length) return [];
    const out = [];
    for (let i = 0; i < count; i += 1) {
      const index = Math.floor((i / Math.max(1, count - 1)) * (points.length - 1));
      out.push({ ...points[index] });
    }
    return out;
  }

  function allocateSegments(segments, totalCount) {
    const weights = segments.map((segment) => segment.weight || 1);
    const weightSum = weights.reduce((sum, value) => sum + value, 0);
    let used = 0;
    return segments.map((segment, index) => {
      const remainingSegments = segments.length - index - 1;
      const count =
        index === segments.length - 1
          ? totalCount - used
          : Math.max(3, Math.round((totalCount * weights[index]) / weightSum));
      used += count;
      if (remainingSegments > 0 && totalCount - used < remainingSegments * 3) {
        used = totalCount - remainingSegments * 3;
        return Math.max(3, totalCount - remainingSegments * 3);
      }
      return Math.max(3, count);
    });
  }

  function sampleSegments(segments, totalCount) {
    const counts = allocateSegments(segments, totalCount);
    return segments.flatMap((segment, index) => segment.draw(counts[index]));
  }

  function generateHeartPoints(count, bounds) {
    const raw = [];
    const steps = Math.max(count * 4, 360);
    for (let i = 0; i < steps; i += 1) {
      const t = (Math.PI * 2 * i) / steps;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y =
        -(
          13 * Math.cos(t) -
          5 * Math.cos(2 * t) -
          2 * Math.cos(3 * t) -
          Math.cos(4 * t)
        );
      raw.push({ x, y });
    }
    return takeDistributed(scaleAndCenterPoints(raw, bounds), count);
  }

  function generateInfinityPoints(count, bounds) {
    const raw = [];
    const steps = Math.max(count * 5, 420);
    for (let i = 0; i < steps; i += 1) {
      const t = (Math.PI * 2 * i) / steps;
      const denominator = 1 + Math.sin(t) * Math.sin(t);
      raw.push({
        x: (Math.cos(t) * 220) / denominator,
        y: (Math.sin(t) * Math.cos(t) * 160) / denominator
      });
    }
    return takeDistributed(scaleAndCenterPoints(raw, bounds), count);
  }

  function createS(offsetX, width, height) {
    const x = offsetX;
    const w = width;
    const h = height;
    return [
      {
        weight: 1.3,
        draw: (n) =>
          sampleCubicBezier(
            { x: x + w * 0.88, y: h * 0.1 },
            { x: x + w * 0.12, y: h * -0.03 },
            { x: x + w * 0.1, y: h * 0.43 },
            { x: x + w * 0.52, y: h * 0.47 },
            n
          )
      },
      {
        weight: 1.3,
        draw: (n) =>
          sampleCubicBezier(
            { x: x + w * 0.52, y: h * 0.47 },
            { x: x + w * 1.02, y: h * 0.54 },
            { x: x + w * 0.9, y: h * 1.07 },
            { x: x + w * 0.12, y: h * 0.88 },
            n
          )
      }
    ];
  }

  function createD(offsetX, width, height) {
    const x = offsetX;
    const w = width;
    const h = height;
    return [
      { weight: 0.8, draw: (n) => sampleLine(x + w * 0.16, h * 0.1, x + w * 0.16, h * 0.9, n) },
      {
        weight: 1.8,
        draw: (n) =>
          sampleCubicBezier(
            { x: x + w * 0.16, y: h * 0.1 },
            { x: x + w * 0.98, y: h * 0.08 },
            { x: x + w * 1.02, y: h * 0.9 },
            { x: x + w * 0.16, y: h * 0.9 },
            n
          )
      }
    ];
  }

  function createR(offsetX, width, height) {
    const x = offsetX;
    const w = width;
    const h = height;
    return [
      { weight: 0.9, draw: (n) => sampleLine(x + w * 0.16, h * 0.1, x + w * 0.16, h * 0.9, n) },
      {
        weight: 1.2,
        draw: (n) =>
          sampleCubicBezier(
            { x: x + w * 0.16, y: h * 0.1 },
            { x: x + w * 0.92, y: h * 0.08 },
            { x: x + w * 0.9, y: h * 0.53 },
            { x: x + w * 0.18, y: h * 0.52 },
            n
          )
      },
      { weight: 0.8, draw: (n) => sampleLine(x + w * 0.46, h * 0.54, x + w * 0.96, h * 0.9, n) }
    ];
  }

  function createA(offsetX, width, height) {
    const x = offsetX;
    const w = width;
    const h = height;
    return [
      { weight: 1, draw: (n) => sampleLine(x + w * 0.08, h * 0.9, x + w * 0.5, h * 0.1, n) },
      { weight: 1, draw: (n) => sampleLine(x + w * 0.5, h * 0.1, x + w * 0.92, h * 0.9, n) },
      { weight: 0.52, draw: (n) => sampleLine(x + w * 0.3, h * 0.58, x + w * 0.7, h * 0.58, n) }
    ];
  }

  function createI(offsetX, width, height) {
    const x = offsetX;
    const w = width;
    const h = height;
    return [
      { weight: 0.65, draw: (n) => sampleLine(x + w * 0.2, h * 0.12, x + w * 0.8, h * 0.12, n) },
      { weight: 1, draw: (n) => sampleLine(x + w * 0.5, h * 0.12, x + w * 0.5, h * 0.9, n) },
      { weight: 0.65, draw: (n) => sampleLine(x + w * 0.2, h * 0.9, x + w * 0.8, h * 0.9, n) }
    ];
  }

  function generateWordPoints(letters, count, bounds) {
    const height = 300;
    const letterGap = 32;
    const widths = { S: 190, D: 195, R: 190, A: 185, I: 95 };
    const totalWidth =
      letters.reduce((sum, letter) => sum + widths[letter], 0) + letterGap * (letters.length - 1);
    let offset = 0;
    const letterSegments = [];

    letters.forEach((letter) => {
      const width = widths[letter];
      if (letter === "S") letterSegments.push(...createS(offset, width, height));
      if (letter === "D") letterSegments.push(...createD(offset, width, height));
      if (letter === "R") letterSegments.push(...createR(offset, width, height));
      if (letter === "A") letterSegments.push(...createA(offset, width, height));
      if (letter === "I") letterSegments.push(...createI(offset, width, height));
      offset += width + letterGap;
    });

    const raw = sampleSegments(letterSegments, Math.max(count * 2, 360)).map((point) => ({
      x: point.x - totalWidth / 2,
      y: point.y - height / 2
    }));
    return takeDistributed(scaleAndCenterPoints(raw, bounds), count);
  }

  function generateSDRAPoints(count, bounds) {
    return generateWordPoints(["S", "D", "R", "A"], count, bounds);
  }

  function generateSIDRAPoints(count, bounds) {
    return generateWordPoints(["S", "I", "D", "R", "A"], count, bounds);
  }

  function generateConstellationPoints(bounds) {
    const content = window.SIDRA_SKY_CONTENT;
    const box = bounds || { width: 1000, height: 620 };
    return content.constellation.map((point) => ({
      ...point,
      x: (point.x / 100) * box.width,
      y: (point.y / 100) * box.height
    }));
  }

  window.SidraShapes = {
    sampleLine,
    samplePolyline,
    sampleQuadraticBezier,
    sampleCubicBezier,
    normalizePoints,
    scaleAndCenterPoints,
    generateHeartPoints,
    generateInfinityPoints,
    generateSDRAPoints,
    generateSIDRAPoints,
    generateConstellationPoints
  };
})();
