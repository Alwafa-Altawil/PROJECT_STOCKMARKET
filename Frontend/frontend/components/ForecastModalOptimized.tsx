'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Forecast } from '@/types';
import { apiService } from '@/lib/api-service';

interface ForecastModalProps {
  forecast: Forecast | null;
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

// OPTIMIZATION 1: Data downsampling using Largest-Triangle-Three-Buckets algorithm
// Reduces points while preserving visual accuracy
const downsampleData = (data: number[], bucketSize: number): number[] => {
  if (data.length <= bucketSize) return data;

  const result: number[] = [data[0]]; // Keep first point

  for (let i = 1; i < data.length - 1; i += bucketSize) {
    const bucket = data.slice(i, Math.min(i + bucketSize, data.length - 1));
    const maxPrice = Math.max(...bucket);
    const minPrice = Math.min(...bucket);
    const avgPrice = bucket.reduce((a, b) => a + b, 0) / bucket.length;
    
    // Use the point closest to average for best representation
    let closest = bucket[0];
    let closestDist = Math.abs(closest - avgPrice);
    
    for (const price of bucket) {
      const dist = Math.abs(price - avgPrice);
      if (dist < closestDist) {
        closest = price;
        closestDist = dist;
      }
    }
    
    result.push(closest);
  }

  result.push(data[data.length - 1]); // Keep last point
  return result;
};

// OPTIMIZATION 2: Debounce hook for resize events
const useDebounce = (callback: (...args: any[]) => void, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return useCallback(
    (...args: any[]) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay]
  );
};

export const ForecastModalOptimized = ({ forecast, isOpen, onClose, isDarkMode }: ForecastModalProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any[]>([]);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OPTIMIZATION 3: Debounced resize handler
  const handleResizeDebounced = useDebounce(() => {
    if (!containerRef.current || !chartRef.current) return;

    try {
      const newWidth = containerRef.current.clientWidth;
      if (newWidth > 100) {
        chartRef.current.applyOptions({
          width: newWidth,
        });
      }
    } catch (err) {
      console.error('Resize error:', err);
    }
  }, 300);

  useEffect(() => {
    if (!isOpen || !forecast) return;

    let isMounted = true;

    const initChart = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch forecast paths
        const data = await apiService.fetchForecastPaths(forecast.id);
        const paths = (data.paths as number[][]) || [];

        if (!isMounted) return;

        // Clear container
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        // Load lightweight-charts library
        if (!(window as any).LightweightCharts) {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/lightweight-charts@4/dist/lightweight-charts.standalone.production.js';
          script.async = true;

          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load lightweight-charts'));
            document.head.appendChild(script);
          });
        }

        if (!isMounted) return;

        const { createChart } = (window as any).LightweightCharts as any;
        if (!containerRef.current) return;

        const width = containerRef.current.clientWidth || 600;
        const height = 400;

        // OPTIMIZATION 4: Lean chart configuration - disable unnecessary features
        const chart = createChart(containerRef.current, {
          width: Math.max(width, 100),
          height: Math.max(height, 100),
          layout: {
            textColor: isDarkMode ? '#e4e4e7' : '#626262',
            background: { type: 'solid' as const, color: isDarkMode ? '#3f3f46' : '#ffffff' },
            fontSize: 12,
          },
          timeScale: {
            timeVisible: false,
            secondsVisible: false,
            rightOffset: 5,
            barSpacing: 3,
            fixLeftEdge: true,
            lockRange: false,
          },
          rightPriceScale: {
            borderVisible: false,
            autoScale: true,
            mode: 1, // Percentage mode for better scaling
          },
          crosshair: {
            mode: 1, // Normal crosshair
            vertLine: {
              width: 1,
              color: isDarkMode ? '#52525b' : '#cccccc',
              style: 1,
            },
            horzLine: {
              width: 1,
              color: isDarkMode ? '#52525b' : '#cccccc',
              style: 1,
            },
          },
          grid: {
            horzLines: { visible: true, color: isDarkMode ? '#4f46e5' : '#f0f0f0' },
            vertLines: { visible: false }, // Disable to reduce rendering
          },
          handleScale: {
            mouseWheel: true,
            pinch: true,
          },
          handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
          },
        });

        seriesRef.current = [];

        // OPTIMIZATION 5: Aggressive downsampling for paths
        const downsampleFactor = Math.max(1, Math.floor(forecast.horizon_days / 30));
        const pathsToRender = Math.min(25, Math.max(10, Math.floor(paths.length / 3))); // Render max 25 paths
        const pathStep = Math.floor(paths.length / pathsToRender);

        // Render downsampled paths
        for (let i = 0; i < paths.length; i += Math.max(1, pathStep)) {
          const path = paths[i];
          if (!path || path.length === 0) continue;

          // Downsample individual path
          const downsampledPath = downsampleData(path, downsampleFactor);

          const lineSeries = chart.addLineSeries({
            color: '#2563eb',
            lineWidth: 0.8,
            crosshairMarkerVisible: false, // Don't show marker on hover
          });

          const chartData = downsampledPath.map((price, index) => ({
            time: index * downsampleFactor,
            value: price,
          }));

          lineSeries.setData(chartData);
          seriesRef.current.push(lineSeries);
        }

        // Add percentile lines (these are critical, keep full resolution)
        const p5Line = chart.addLineSeries({
          color: '#ef4444',
          lineWidth: 2.5,
          crosshairMarkerVisible: true,
        });

        const p50Line = chart.addLineSeries({
          color: '#eab308',
          lineWidth: 2.5,
          crosshairMarkerVisible: true,
        });

        const p95Line = chart.addLineSeries({
          color: '#22c55e',
          lineWidth: 2.5,
          crosshairMarkerVisible: true,
        });

        seriesRef.current.push(p5Line, p50Line, p95Line);

        // Set percentile data
        const startPrice = Number(forecast.stock.price);
        const endIndex = forecast.horizon_days;

        p5Line.setData([
          { time: 0, value: startPrice },
          { time: endIndex, value: Number(data.percentile_5) },
        ]);

        p50Line.setData([
          { time: 0, value: startPrice },
          { time: endIndex, value: Number(data.median) },
        ]);

        p95Line.setData([
          { time: 0, value: startPrice },
          { time: endIndex, value: Number(data.percentile_95) },
        ]);

        chart.timeScale().fitContent();
        chartRef.current = chart;

        if (!isMounted) return;
        setLoading(false);

        // OPTIMIZATION 6: Use ResizeObserver instead of window resize event
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
        }

        resizeObserverRef.current = new ResizeObserver(() => {
          handleResizeDebounced();
        });

        if (containerRef.current) {
          resizeObserverRef.current.observe(containerRef.current);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Forecast chart error:', err);
          setError(String(err));
          setLoading(false);
        }
      }
    };

    initChart();

    // OPTIMIZATION 7: Proper cleanup to prevent memory leaks
    return () => {
      isMounted = false;

      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }

      if (chartRef.current) {
        try {
          seriesRef.current = [];
          chartRef.current.remove();
          chartRef.current = null;
        } catch (err) {
          console.error('Cleanup error:', err);
        }
      }
    };
  }, [isOpen, forecast, handleResizeDebounced]);

  if (!isOpen || !forecast) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className={`rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto my-auto transition-colors duration-300 ${
        isDarkMode
          ? "bg-zinc-800"
          : "bg-white"
      }`}>
        <div className={`sticky top-0 p-6 flex justify-between items-center z-10 border-b transition-colors duration-300 ${
          isDarkMode
            ? "bg-zinc-800 border-zinc-700"
            : "bg-white border-zinc-200"
        }`}>
          <div>
            <h2 className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>{forecast.stock.symbol} Forecast</h2>
            <p className={`text-sm mt-1 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
              {forecast.horizon_days} days • {forecast.paths.toLocaleString()} simulations
            </p>
          </div>
          <button
            onClick={onClose}
            className={`text-3xl font-bold leading-none p-0 transition-colors duration-300 ${
              isDarkMode
                ? "text-zinc-400 hover:text-zinc-200"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex flex-col justify-center items-center h-96 gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className={`font-medium ${isDarkMode ? "text-zinc-200" : "text-zinc-700"}`}>Optimizing visualization...</p>
              <p className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-zinc-500"}`}>
                Downsampling {forecast.paths.toLocaleString()} simulations for smooth rendering
              </p>
            </div>
          )}

          {error && (
            <div className={`border rounded p-4 transition-colors duration-300 ${
              isDarkMode
                ? "bg-red-900 border-red-700 text-red-200"
                : "bg-red-50 border-red-200 text-red-700"
            }`}>
              Error: {error}
            </div>
          )}

          {!loading && !error && (
            <>
              <div
                ref={containerRef}
                style={{
                  width: '100%',
                  height: '400px',
                  position: 'relative',
                  marginBottom: '24px',
                  background: isDarkMode ? '#3f3f46' : '#ffffff',
                }}
                className={`border rounded transition-colors duration-300 ${
                  isDarkMode
                    ? "border-zinc-700"
                    : "border-zinc-200"
                }`}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-6 border-t transition-colors duration-300" style={{borderTopColor: isDarkMode ? '#3f3f46' : '#e4e4e7'}}>
                <div className={`p-4 rounded transition-colors duration-300 ${
                  isDarkMode
                    ? "bg-red-900 text-red-200"
                    : "bg-red-50"
                }`}>
                  <p className={`text-sm font-semibold ${isDarkMode ? "text-red-200" : "text-red-600"}`}>5th Percentile</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? "text-red-200" : "text-red-700"}`}>
                    ${Number(forecast.percentile_5).toFixed(2)}
                  </p>
                </div>

                <div className={`p-4 rounded transition-colors duration-300 ${
                  isDarkMode
                    ? "bg-yellow-900 text-yellow-200"
                    : "bg-yellow-50"
                }`}>
                  <p className={`text-sm font-semibold ${isDarkMode ? "text-yellow-200" : "text-yellow-600"}`}>Median</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? "text-yellow-200" : "text-yellow-700"}`}>
                    ${Number(forecast.median).toFixed(2)}
                  </p>
                </div>

                <div className={`p-4 rounded transition-colors duration-300 ${
                  isDarkMode
                    ? "bg-green-900 text-green-200"
                    : "bg-green-50"
                }`}>
                  <p className={`text-sm font-semibold ${isDarkMode ? "text-green-200" : "text-green-600"}`}>95th Percentile</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? "text-green-200" : "text-green-700"}`}>
                    ${Number(forecast.percentile_95).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className={`mt-6 p-4 rounded transition-colors duration-300 ${
                isDarkMode
                  ? "bg-blue-900 text-blue-200"
                  : "bg-blue-50"
              }`}>
                <p className={`text-sm font-semibold ${isDarkMode ? "text-blue-200" : "text-blue-600"}`}>Probability of Price Increase</p>
                <p className={`text-2xl font-bold ${isDarkMode ? "text-blue-200" : "text-blue-700"}`}>
                  {(Number(forecast.probability_up) * 100).toFixed(1)}%
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
