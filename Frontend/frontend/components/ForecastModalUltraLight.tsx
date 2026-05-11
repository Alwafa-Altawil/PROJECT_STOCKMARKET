'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Forecast } from '@/types';
import { apiService } from '@/lib/api-service';

interface ForecastModalProps {
  forecast: Forecast | null;
  isOpen: boolean;
  onClose: () => void;
}

// Ultra-lightweight Canvas-based visualization
export const ForecastModalUltraLight = ({ forecast, isOpen, onClose }: ForecastModalProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<{
    paths: number[][];
    p5: number;
    p50: number;
    p95: number;
  } | null>(null);

  // Resize handler
  useEffect(() => {
    if (!isOpen || !canvasRef.current || !chartData) return;

    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const width = containerRef.current.clientWidth - 32; // Account for padding
      canvasRef.current.width = width;
      canvasRef.current.height = 400;
      drawChart();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [chartData]);

  // Main chart drawing function using Canvas API (no external library)
  const drawChart = useCallback(() => {
    if (!canvasRef.current || !chartData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { paths, p5, p50, p95 } = chartData;
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    // Get data range
    const allPrices = paths.flat();
    const minPrice = Math.min(...allPrices, p5, p50, p95);
    const maxPrice = Math.max(...allPrices, p5, p50, p95);
    const priceRange = maxPrice - minPrice;

    // Helper function to scale x,y to canvas coordinates
    const scaleX = (dayIndex: number, totalDays: number) => {
      return padding + ((dayIndex / (totalDays - 1 || 1)) * (width - 2 * padding));
    };

    const scaleY = (price: number) => {
      return height - padding - ((price - minPrice) / (priceRange || 1)) * (height - 2 * padding);
    };

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    const gridLinesX = 5;
    for (let i = 0; i <= gridLinesX; i++) {
      const x = padding + (i / gridLinesX) * (width - 2 * padding);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    const gridLinesY = 5;
    for (let i = 0; i <= gridLinesY; i++) {
      const y = padding + (i / gridLinesY) * (height - 2 * padding);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw price range labels on Y-axis
    ctx.fillStyle = '#626262';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= gridLinesY; i++) {
      const price = minPrice + (i / gridLinesY) * priceRange;
      const y = height - padding - (i / gridLinesY) * (height - 2 * padding);
      ctx.fillText(`$${price.toFixed(0)}`, padding - 10, y + 4);
    }

    // Draw day labels on X-axis
    ctx.textAlign = 'center';
    const maxDays = paths[0]?.length || 1;
    for (let i = 0; i <= gridLinesX; i++) {
      const day = Math.floor((i / gridLinesX) * (maxDays - 1));
      const x = scaleX(day, maxDays);
      ctx.fillText(`D${day}`, x, height - 20);
    }

    // Draw simulation paths (light blue, thin lines)
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.15)';
    ctx.lineWidth = 0.8;
    for (const path of paths) {
      ctx.beginPath();
      for (let i = 0; i < path.length; i++) {
        const x = scaleX(i, path.length);
        const y = scaleY(path[i]);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    const maxDaysInPath = paths[0]?.length || 1;

    // Draw percentile lines (thick, visible lines)
    const percentiles = [
      { value: p5, color: '#ef4444', label: '5th' }, // Red
      { value: p50, color: '#eab308', label: '50th' }, // Yellow
      { value: p95, color: '#22c55e', label: '95th' }, // Green
    ];

    for (const { value, color } of percentiles) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const startPrice = paths[0]?.[0] || value;
      ctx.moveTo(scaleX(0, maxDaysInPath), scaleY(startPrice));
      ctx.lineTo(scaleX(maxDaysInPath - 1, maxDaysInPath), scaleY(value));
      ctx.stroke();
    }

    // Draw legend
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    let legendX = padding + 10;
    const legendY = padding - 15;

    for (const { color, label, value } of percentiles) {
      ctx.fillStyle = color;
      ctx.fillRect(legendX, legendY - 8, 12, 12);
      ctx.fillStyle = '#626262';
      ctx.fillText(`${label}: $${value.toFixed(2)}`, legendX + 18, legendY);
      legendX += 180;
    }
  }, [chartData]);

  // Draw when data or canvas size changes
  useEffect(() => {
    if (chartData && canvasRef.current) {
      // Set initial dimensions
      if (containerRef.current) {
        const width = containerRef.current.clientWidth - 32;
        canvasRef.current.width = width;
        canvasRef.current.height = 400;
      }
      drawChart();
    }
  }, [chartData, drawChart]);

  // Fetch data on modal open
  useEffect(() => {
    if (!isOpen || !forecast) return;

    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiService.fetchForecastPaths(forecast.id);
        
        if (isMounted) {
          setChartData({
            paths: data.paths || [],
            p5: data.percentile_5,
            p50: data.median,
            p95: data.percentile_95,
          });
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(String(err));
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, forecast]);

  if (!isOpen || !forecast) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto my-auto">
        <div className="sticky top-0 bg-white border-b border-zinc-200 p-6 flex justify-between items-center z-10">
          <div>
            <h2 className="text-2xl font-bold">{forecast.stock.symbol} Forecast</h2>
            <p className="text-sm text-zinc-600 mt-1">
              {forecast.horizon_days} days • {forecast.paths.toLocaleString()} simulations
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-700 text-3xl font-bold leading-none p-0"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex flex-col justify-center items-center h-96 gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-zinc-700 font-medium">Generating forecast visualization...</p>
              <p className="text-sm text-zinc-500">Ultra-light rendering (no external charts)</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
              Error: {error}
            </div>
          )}

          {!loading && !error && chartData && (
            <>
              <div
                ref={containerRef}
                className="w-full border border-zinc-200 rounded overflow-hidden"
                style={{ background: '#ffffff' }}
              >
                <canvas
                  ref={canvasRef}
                  className="w-full"
                  style={{ display: 'block' }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-6 border-t border-zinc-200">
                <div className="p-4 bg-red-50 rounded">
                  <p className="text-sm text-red-600 font-semibold">5th Percentile</p>
                  <p className="text-2xl font-bold text-red-700">
                    ${chartData.p5.toFixed(2)}
                  </p>
                </div>

                <div className="p-4 bg-yellow-50 rounded">
                  <p className="text-sm text-yellow-600 font-semibold">Median</p>
                  <p className="text-2xl font-bold text-yellow-700">
                    ${chartData.p50.toFixed(2)}
                  </p>
                </div>

                <div className="p-4 bg-green-50 rounded">
                  <p className="text-sm text-green-600 font-semibold">95th Percentile</p>
                  <p className="text-2xl font-bold text-green-700">
                    ${chartData.p95.toFixed(2)}
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
