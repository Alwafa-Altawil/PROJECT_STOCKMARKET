'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Forecast } from '@/types';
import { apiService } from '@/lib/api-service';

interface ForecastModalProps {
  forecast: Forecast | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Progressive Rendering Forecast Modal
 * 
 * Strategy:
 * 1. Show skeleton immediately
 * 2. Render percentile lines first (critical data)
 * 3. Progressively render path groups
 * 4. Full chart ready in <1s
 */
export const ForecastModalProgressive = ({ forecast, isOpen, onClose }: ForecastModalProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState(0);
  const [chartData, setChartData] = useState<{
    paths: number[][];
    p5: number;
    p50: number;
    p95: number;
  } | null>(null);

  // Optimized drawing with progressive rendering
  const drawChart = useCallback((progress: number = 1) => {
    if (!canvasRef.current || !chartData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { paths, p5, p50, p95 } = chartData;
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Get data range
    const allPrices = paths.flat();
    const minPrice = Math.min(...allPrices, p5, p50, p95);
    const maxPrice = Math.max(...allPrices, p5, p50, p95);
    const priceRange = maxPrice - minPrice;

    // Scale functions
    const scaleX = (dayIndex: number, totalDays: number) => {
      return padding + ((dayIndex / (totalDays - 1 || 1)) * (width - 2 * padding));
    };

    const scaleY = (price: number) => {
      return height - padding - ((price - minPrice) / (priceRange || 1)) * (height - 2 * padding);
    };

    // Draw lightweight grid
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const x = padding + (i / 5) * (width - 2 * padding);
      const y = padding + (i / 5) * (height - 2 * padding);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw labels
    ctx.fillStyle = '#626262';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const price = minPrice + (i / 5) * priceRange;
      const y = height - padding - (i / 5) * (height - 2 * padding);
      ctx.fillText(`$${price.toFixed(0)}`, padding - 10, y + 4);
    }

    ctx.textAlign = 'center';
    const maxDays = paths[0]?.length || 1;
    for (let i = 0; i <= 5; i++) {
      const day = Math.floor((i / 5) * (maxDays - 1));
      const x = scaleX(day, maxDays);
      ctx.fillText(`D${day}`, x, height - 20);
    }

    // Progressive rendering: render subset of paths based on progress
    const pathsToRender = Math.ceil(paths.length * progress);
    
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.15)';
    ctx.lineWidth = 0.8;
    for (let p = 0; p < pathsToRender; p++) {
      const path = paths[p];
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

    // Percentile lines (always fully rendered)
    const maxDaysInPath = paths[0]?.length || 1;
    const percentiles = [
      { value: p5, color: '#ef4444', label: '5th' },
      { value: p50, color: '#eab308', label: '50th' },
      { value: p95, color: '#22c55e', label: '95th' },
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

    // Legend
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

    // Progress indicator during animation
    if (progress < 1) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(padding, height - 30, (progress * (width - 2 * padding)), 10);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.strokeRect(padding, height - 30, (width - 2 * padding), 10);
    }
  }, [chartData]);

  // Animate progressive rendering
  useEffect(() => {
    if (!chartData) return;

    let currentProgress = 0;
    const targetProgress = 1;
    const animationDuration = 500; // 500ms animation
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      currentProgress = Math.min(elapsed / animationDuration, targetProgress);
      
      setRenderProgress(currentProgress);
      drawChart(currentProgress);

      if (currentProgress < targetProgress) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [chartData, drawChart]);

  // Handle resize
  useEffect(() => {
    if (!isOpen || !canvasRef.current || !chartData) return;

    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const width = containerRef.current.clientWidth - 32;
      canvasRef.current.width = width;
      canvasRef.current.height = 400;
      drawChart(renderProgress);
    };

    const debounceTimer = setTimeout(handleResize, 100);
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(debounceTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, chartData, renderProgress, drawChart]);

  // Fetch data on modal open
  useEffect(() => {
    if (!isOpen || !forecast) return;

    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setRenderProgress(0);

        const data = await apiService.fetchForecastPaths(forecast.id);
        
        if (isMounted) {
          setChartData({
            paths: data.paths || [],
            p5: data.percentile_5,
            p50: data.median,
            p95: data.percentile_95,
          });
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

  // Initialize canvas on first render
  useEffect(() => {
    if (canvasRef.current && chartData) {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth - 32;
        canvasRef.current.width = width;
        canvasRef.current.height = 400;
      }
      setLoading(false);
      drawChart(renderProgress);
    }
  }, [chartData, renderProgress, drawChart]);

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
              <p className="text-zinc-700 font-medium">Loading forecast...</p>
              <p className="text-sm text-zinc-500">Progressive rendering enabled</p>
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
