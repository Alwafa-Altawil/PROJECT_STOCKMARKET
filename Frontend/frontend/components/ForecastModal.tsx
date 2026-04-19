'use client';

import { useEffect, useRef, useState } from 'react';
import { Forecast } from '@/types';
import { apiService } from '@/lib/api-service';

interface ForecastModalProps {
  forecast: Forecast | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ForecastModal = ({ forecast, isOpen, onClose }: ForecastModalProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !forecast) return;

    const loadAndRenderChart = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch forecast paths
        const data = await apiService.fetchForecastPaths(forecast.id);
        const paths = data.paths as number[][];

        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        // Load lightweight-charts from CDN
        if (!window.LightweightCharts) {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/lightweight-charts@4/dist/lightweight-charts.standalone.production.js';
          script.async = true;

          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        const { createChart } = window.LightweightCharts as any;

        if (!containerRef.current) return;

        const width = containerRef.current.clientWidth || 600;
        const height = 400;

        const chart = createChart(containerRef.current, {
          width: Math.max(width, 100),
          height: Math.max(height, 100),
          timeScale: {
            timeVisible: false,
            secondsVisible: false,
          },
        });

        // Add lines for sampled paths with low opacity (only render every other path)
        const renderRate = Math.max(1, Math.floor(paths.length / 50));
        
        for (let i = 0; i < paths.length; i += renderRate) {
          const path = paths[i];
          const lineSeries = chart.addLineSeries({
            color: '#2563eb',
            lineWidth: 0.5,
          });

          const chartData = path.map((price, index) => ({
            time: index,
            value: price,
          }));

          lineSeries.setData(chartData);
        }

        // Add percentile lines
        const p5Line = chart.addLineSeries({
          color: '#ef4444', // Red for percentile_5
          lineWidth: 2,
          title: `5th Percentile: $${Number(data.percentile_5).toFixed(2)}`,
        });

        const p50Line = chart.addLineSeries({
          color: '#eab308', // Yellow for percentile_50
          lineWidth: 2,
          title: `Median: $${Number(data.median).toFixed(2)}`,
        });

        const p95Line = chart.addLineSeries({
          color: '#22c55e', // Green for percentile_95
          lineWidth: 2,
          title: `95th Percentile: $${Number(data.percentile_95).toFixed(2)}`,
        });

        // Create percentile data
        const percentileData = Array.from({ length: forecast.horizon_days + 1 }).map((_, index) => ({
          time: index,
          value: null,
        }));

        // For simplicity, we'll just add the final percentile values
        // In a real scenario, you might want to calculate percentiles at each time step
        const finalIndex = forecast.horizon_days;
        p5Line.setData([
          { time: 0, value: Number(forecast.stock.price) },
          { time: finalIndex, value: Number(data.percentile_5) },
        ]);

        p50Line.setData([
          { time: 0, value: Number(forecast.stock.price) },
          { time: finalIndex, value: Number(data.median) },
        ]);

        p95Line.setData([
          { time: 0, value: Number(forecast.stock.price) },
          { time: finalIndex, value: Number(data.percentile_95) },
        ]);

        chart.timeScale().fitContent();

        chartRef.current = chart;
        setLoading(false);

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

        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
          try {
            chart.remove();
          } catch {
            // ignore
          }
        };
      } catch (err) {
        console.error('Forecast chart error:', err);
        setError(String(err));
        setLoading(false);
      }
    };

    loadAndRenderChart();
  }, [isOpen, forecast]);

  if (!isOpen || !forecast) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-zinc-200 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">{forecast.stock.symbol} Forecast</h2>
            <p className="text-sm text-zinc-600 mt-1">
              {forecast.horizon_days} days • {forecast.paths} simulations
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex flex-col justify-center items-center h-96 gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-zinc-600">Loading Monte Carlo visualization...</p>
              <p className="text-sm text-zinc-500">This may take a few seconds with {forecast.paths.toLocaleString()} simulations</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
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
                }}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-6 border-t border-zinc-200">
                <div className="p-4 bg-red-50 rounded">
                  <p className="text-sm text-red-600 font-semibold">5th Percentile</p>
                  <p className="text-2xl font-bold text-red-700">
                    ${Number(forecast.percentile_5).toFixed(2)}
                  </p>
                </div>

                <div className="p-4 bg-yellow-50 rounded">
                  <p className="text-sm text-yellow-600 font-semibold">Median</p>
                  <p className="text-2xl font-bold text-yellow-700">
                    ${Number(forecast.median).toFixed(2)}
                  </p>
                </div>

                <div className="p-4 bg-green-50 rounded">
                  <p className="text-sm text-green-600 font-semibold">95th Percentile</p>
                  <p className="text-2xl font-bold text-green-700">
                    ${Number(forecast.percentile_95).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded">
                <p className="text-sm text-blue-600 font-semibold">Probability of Price Increase</p>
                <p className="text-2xl font-bold text-blue-700">
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
