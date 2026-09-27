import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import type { GfsWaveForecastRow } from '../types';

const MARGIN = { top: 16, right: 16, bottom: 28, left: 36 };
const HEIGHT = 280;
const SWELL_COLORS = d3.schemeTableau10;

export function SwellHeightChart({
  rows,
  selectedTime,
  onSelectTime,
}: {
  rows: GfsWaveForecastRow[];
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const svgEl = svgRef.current;
    if (!container || !svgEl || rows.length === 0) return;

    const width = container.clientWidth;
    const innerWidth = width - MARGIN.left - MARGIN.right;
    const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

    const parsed = rows.map((row) => ({ ...row, date: new Date(row.time) }));
    const maxSystems = rows.reduce((max, row) => Math.max(max, row.systems.length), 0);

    const x = d3.scaleTime(d3.extent(parsed, (d) => d.date) as [Date, Date], [0, innerWidth]);
    const maxHeight = d3.max(parsed, (d) =>
      Math.max(d.totalWaveHeightFt, ...d.systems.map((s) => s.waveHeightFt)),
    ) ?? 1;
    const y = d3.scaleLinear([0, maxHeight * 1.1], [innerHeight, 0]);

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', HEIGHT);

    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat((d) => d3.utcFormat('%m/%d %HZ')(d as Date)))
      .call((axis) => axis.selectAll('text').attr('font-size', '0.7rem'));

    g.append('g')
      .call(d3.axisLeft(y).ticks(5))
      .call((axis) => axis.selectAll('text').attr('font-size', '0.7rem'));

    g.append('text')
      .attr('x', -MARGIN.left + 4)
      .attr('y', -6)
      .attr('font-size', '0.7rem')
      .attr('fill', 'currentColor')
      .attr('opacity', 0.7)
      .text('ft');

    g.append('path')
      .datum(parsed)
      .attr('fill', 'none')
      .attr('stroke', 'currentColor')
      .attr('stroke-opacity', 0.35)
      .attr('stroke-dasharray', '4,3')
      .attr('stroke-width', 1.5)
      .attr(
        'd',
        d3
          .line<(typeof parsed)[number]>()
          .x((d) => x(d.date))
          .y((d) => y(d.totalWaveHeightFt)),
      );

    for (let i = 0; i < maxSystems; i++) {
      const swellPoints = parsed.filter((d) => d.systems[i]);
      if (swellPoints.length === 0) continue;
      g.append('path')
        .datum(swellPoints)
        .attr('fill', 'none')
        .attr('stroke', SWELL_COLORS[i % SWELL_COLORS.length])
        .attr('stroke-width', 2)
        .attr(
          'd',
          d3
            .line<(typeof parsed)[number]>()
            .x((d) => x(d.date))
            .y((d) => y(d.systems[i].waveHeightFt)),
        );
    }

    const bisectDate = d3.bisector<(typeof parsed)[number], Date>((d) => d.date).left;
    const crosshair = g.append('line').attr('stroke', 'currentColor').attr('stroke-opacity', 0.3).attr('y1', 0).attr('y2', innerHeight).style('display', 'none');

    g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .on('mousemove', (event: MouseEvent) => {
        const [mx] = d3.pointer(event);
        const targetDate = x.invert(mx);
        const idx = bisectDate(parsed, targetDate, 1);
        const d0 = parsed[idx - 1];
        const d1 = parsed[idx];
        const nearest =
          !d1 || Math.abs(targetDate.getTime() - d0.date.getTime()) < Math.abs(targetDate.getTime() - d1.date.getTime())
            ? d0
            : d1;
        crosshair.style('display', null).attr('x1', x(nearest.date)).attr('x2', x(nearest.date));
        onSelectTime(nearest.time);
      })
      .on('mouseleave', () => crosshair.style('display', 'none'));

    if (selectedTime) {
      const selected = parsed.find((d) => d.time === selectedTime);
      if (selected) {
        crosshair.style('display', null).attr('x1', x(selected.date)).attr('x2', x(selected.date));
      }
    }
  }, [rows, onSelectTime, selectedTime]);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg ref={svgRef} />
    </div>
  );
}
