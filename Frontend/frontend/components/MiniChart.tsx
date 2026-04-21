'use client';

import { useEffect, useRef } from 'react';

interface MiniChartProps {
  data: number[];
  symbol: string;
}

export const MiniChart = ({ data, symbol }: MiniChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || !data || data.length === 0) return;

    let isMounted = true;

    const loadAndRenderChart = async () => {
      try {
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        // Load lightweight-charts from CDN
        if (!(window as any).LightweightCharts) {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/lightweight-charts@4/dist/lightweight-charts.standalone.production.js';
          script.async = true;

          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        if (!isMounted) return;

        const { createChart } = (window as any).LightweightCharts as any;

        if (!containerRef.current) return;

        const width = containerRef.current.clientWidth || 200;
        const chart = createChart(containerRef.current, {
          width: Math.max(width, 100),
          height: 80,
          layout: {
            textColor: '#626262',
            background: { type: 'solid' as const, color: '#ffffff' },
            fontSize: 10,
          },
          timeScale: {
            timeVisible: false,
            secondsVisible: false,
          },
          rightPriceScale: {
            borderVisible: false,
            autoScale: true,
          },
          crosshair: {
            mode: 0, // Disabled for mini charts
          },
          grid: {
            horzLines: { visible: false },
            vertLines: { visible: false },
          },
          handleScale: false,
          handleScroll: false,
        });

        const areaSeries = chart.addAreaSeries({
          lineColor: '#2563eb',
          topColor: '#2563eb',
          bottomColor: 'rgba(37, 99, 235, 0.2)',
          lineWidth: 1.5,
          crosshairMarkerVisible: false,
        });

        const chartData = data.map((price, index) => ({
          time: index,
          value: price,
        }));

        areaSeries.setData(chartData);
        chart.timeScale().fitContent();

        chartRef.current = chart;

        // Auto resize on parent resize
        const resizeObserver = new ResizeObserver(() => {
          if (containerRef.current && chartRef.current) {
            try {
              const newWidth = containerRef.current.clientWidth;
              if (newWidth > 0) {
                chartRef.current.applyOptions({ width: newWidth });
              }
            } catch (err) {
              console.error('Resize error:', err);
            }
          }
        });

        if (containerRef.current) {
          resizeObserver.observe(containerRef.current);
        }

        return () => {
          resizeObserver.disconnect();
          try {
            chart.remove();
          } catch {
            // ignore
          }
        };
      } catch (error) {
        if (isMounted) {
          console.error('Mini chart error:', error);
          renderFallbackChart();
        }
      }
    };

    const renderFallbackChart = () => {
      if (containerRef.current && data.length > 0) {
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;
        const points = data
          .map((price, i) => {
            const x = (i / Math.max(data.length - 1, 1)) * 190 + 5;
            const y = 65 - ((price - min) / range) * 50;
            return `${x},${y}`;
          })
          .join(' ');

        containerRef.current.innerHTML = `
          <svg viewBox="0 0 200 80" style="width: 100%; height: 100%; display: block;">
            <defs>
              <linearGradient id="miniGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#2563eb;stop-opacity:0.2" />
              </linearGradient>
            </defs>
            <polyline fill="none" stroke="#2563eb" stroke-width="1.5" points="${points}" />
            <polyline fill="url(#miniGradient)" stroke="none" points="${points} 200,80 0,80" />
          </svg>
        `;
      }
    };

    const cleanup = loadAndRenderChart();

    return () => {
      isMounted = false;
      cleanup?.then((fn: any) => fn?.());
      if (chartRef.current) {
        try {
          chartRef.current.remove();
          chartRef.current = null;
        } catch (err) {
          console.error('Cleanup error:', err);
        }
      }
    };
  }, [data]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '80px',
        position: 'relative',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #f0f0f0',
      }}
    />
  );
};
