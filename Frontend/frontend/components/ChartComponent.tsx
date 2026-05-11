'use client';

import { useEffect, useRef } from 'react';

interface ChartComponentProps {
  data: number[];
  symbol: string;
  height?: number;
  isDarkMode?: boolean;
}

export const ChartComponent = ({ data, symbol, height = 256, isDarkMode }: ChartComponentProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const resizeListenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current || !data || data.length === 0) return;

    let isMounted = true;

    const loadAndRenderChart = async () => {
      try {
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        // Load from CDN as fallback for library issues
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

        const width = containerRef.current.clientWidth || 400;

        const chart = createChart(containerRef.current, {
          width: Math.max(width, 100),
          height: Math.max(height, 100),
          timeScale: {
            timeVisible: false,
            secondsVisible: false,
          },
        });

        if (!chart || typeof chart.addLineSeries !== 'function') {
          throw new Error('Chart initialization failed - invalid object');
        }

        const areaSeries = chart.addAreaSeries({
          lineColor: '#2563eb',
          topColor: '#2563eb',
          bottomColor: 'rgba(37, 99, 235, 0.2)',
          lineWidth: 2,
        });

        const chartData = data.map((price, index) => ({
          time: index,
          value: price,
        }));

        areaSeries.setData(chartData);
        chart.timeScale().fitContent();

        chartRef.current = chart;

        const handleResize = () => {
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
        };

        resizeListenerRef.current = handleResize;
        window.addEventListener('resize', handleResize);
      } catch (error) {
        if (isMounted) {
          console.error('Chart error:', error);
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
            const x = (i / Math.max(data.length - 1, 1)) * 380 + 10;
            const y = 180 - ((price - min) / range) * 160;
            return `${x},${y}`;
          })
          .join(' ');

        containerRef.current.innerHTML = `
          <svg viewBox="0 0 400 200" style="width: 100%; height: 100%; display: block;">
            <defs>
              <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#2563eb;stop-opacity:0.3" />
                <stop offset="100%" style="stop-color:#2563eb;stop-opacity:0" />
              </linearGradient>
            </defs>
            <polyline fill="none" stroke="#2563eb" stroke-width="2" points="${points}" />
            <polyline fill="url(#chartGradient)" stroke="none" points="${points} 400,200 0,200" />
          </svg>
        `;
      }
    };

    loadAndRenderChart();

    // Proper cleanup function
    return () => {
      isMounted = false;

      if (resizeListenerRef.current) {
        window.removeEventListener('resize', resizeListenerRef.current);
        resizeListenerRef.current = null;
      }

      if (chartRef.current) {
        try {
          chartRef.current.remove();
          chartRef.current = null;
        } catch (err) {
          console.error('Cleanup error:', err);
        }
      }
    };
  }, [data, height]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: `${height}px`,
        position: 'relative',
        minHeight: `${height}px`,
        backgroundColor: isDarkMode ? '#3f3f46' : '#fff',
      }}
    />
  );
};
