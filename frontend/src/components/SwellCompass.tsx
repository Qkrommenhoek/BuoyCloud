import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import type { GfsWaveForecastRow } from '../types';

const SIZE = 240;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 28;
const SWELL_COLORS = d3.schemeTableau10;

// Energy flux per crest width: P = ρg²H²T / (32π). Constants drop out for relative scaling.
function energyFlux(waveHeightFt: number, periodSec: number): number {
  return waveHeightFt * waveHeightFt * periodSec;
}

// directionDeg is meteorological "from" (0° = north, clockwise). Arrows point where swell travels (+180°).
function toXY(directionDeg: number, radius: number): [number, number] {
  const angle = (directionDeg - 90) * (Math.PI / 180);
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
}

export function SwellCompass({
  rows,
  selectedTime,
}: {
  rows: GfsWaveForecastRow[];
  selectedTime: string | null;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const row = rows.find((r) => r.time === selectedTime) ?? rows[0] ?? null;

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();
    svg.attr('width', SIZE).attr('height', SIZE);

    const g = svg.append('g').attr('transform', `translate(${CENTER},${CENTER})`);

    g.append('circle').attr('r', RADIUS).attr('fill', 'none').attr('stroke', 'currentColor').attr('stroke-opacity', 0.2);
    g.append('circle').attr('r', RADIUS * 0.5).attr('fill', 'none').attr('stroke', 'currentColor').attr('stroke-opacity', 0.15);

    const compassLabels: [string, number][] = [['N', 0], ['E', 90], ['S', 180], ['W', 270]];
    for (const [label, deg] of compassLabels) {
      const [lx, ly] = toXY(deg, RADIUS + 12);
      g.append('text')
        .attr('x', lx)
        .attr('y', ly)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '0.75rem')
        .attr('opacity', 0.6)
        .attr('fill', 'currentColor')
        .text(label);
    }

    if (!row || row.systems.length === 0) return;

    const maxFlux = d3.max(row.systems, (s) => energyFlux(s.waveHeightFt, s.periodSec)) ?? 1;
    const radiusScale = d3.scaleLinear([0, maxFlux], [RADIUS * 0.15, RADIUS]);

    row.systems.forEach((system, i) => {
      const color = SWELL_COLORS[i % SWELL_COLORS.length];
      const r = radiusScale(energyFlux(system.waveHeightFt, system.periodSec));
      const [x, y] = toXY(system.directionDeg + 180, r);

      g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', color)
        .attr('stroke-width', 2.5)
        .attr('marker-end', `url(#arrow-${i})`);

      svg
        .append('marker')
        .attr('id', `arrow-${i}`)
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 8)
        .attr('refY', 5)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto-start-reverse')
        .append('path')
        .attr('d', 'M0,0 L10,5 L0,10 Z')
        .attr('fill', color);

      const [lx, ly] = toXY(system.directionDeg, Math.min(r + 16, RADIUS + 20));
      g.append('text')
        .attr('x', lx)
        .attr('y', ly)
        .attr('text-anchor', 'middle')
        .attr('font-size', '0.7rem')
        .attr('fill', color)
        .text(`${system.periodSec}s @ ${system.directionDeg}°`);
    });
  }, [row]);

  if (!row || row.systems.length === 0) {
    return (
      <div style={{ width: SIZE, height: SIZE, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
        No swell data for this hour
      </div>
    );
  }

  return <svg ref={svgRef} />;
}
