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

export const ForecastModalOptimized = ({ forecast, isOpen, onClose, isDarkMode }: ForecastModalProps) => {
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

  const drawChart = useCallback(() => {
    if (!canvasRef.current || !chartData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { paths, p5, p50, p95 } = chartData;
    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;

    // Clear canvas
    ctx.fillStyle = isDarkMode ? '#3f3f46' : '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const allPrices = paths.flat();
    const minPrice = Math.min(...allPrices, p5, p50, p95);
    const maxPrice = Math.max(...allPrices, p5, p50, p95);
    const priceRange = maxPrice - minPrice || 1;

    const scaleX = (dayIndex: number, totalDays: number) => {
      return padding + ((dayIndex / Math.max(totalDays - 1, 1)) * (width - 2 * padding));
    };

    const scaleY = (price: number) => {
      return height - padding - ((price - minPrice) / priceRange) * (height - 2 * padding);
    };

    // Draw grid
    ctx.strokeStyle = isDarkMode ? '#52525b' : '#e4e4e7';
    ctx.lineWidth = 0.5;
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

    // Draw axis labels
    ctx.fillStyle = isDarkMode ? '#a1a1aa' : '#71717a';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const price = minPrice + (i / 5) * priceRange;
      const y = height - padding - (i / 5) * (height - 2 * padding);
      ctx.fillText(`${price.toFixed(0)}`, padding - 10, y + 4);
    }

    ctx.textAlign = 'center';
    const maxDays = paths[0]?.length || 1;
    for (let i = 0; i <= 5; i++) {
      const day = Math.floor((i / 5) * (maxDays - 1));
      const x = scaleX(day, maxDays);
      ctx.fillText(`${day}`, x, height - 20);
    }

    // Draw axis titles
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = isDarkMode ? '#d4d4d8' : '#27272a';
    ctx.textAlign = 'center';
    ctx.fillText('Jours', width / 2, height - 2);
    
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Prix ($)', 0, 0);
    ctx.restore();

    // Draw paths (sample every Nth path to reduce rendering)
    const pathSampleRate = Math.max(1, Math.floor(paths.length / 50));
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.35)';
    ctx.lineWidth = 2;
    
    for (let p = 0; p < paths.length; p += pathSampleRate) {
      const path = paths[p];
      if (!path) continue;
      
      ctx.beginPath();
      for (let i = 0; i < path.length; i++) {
        const x = scaleX(i, path.length);
        const y = scaleY(path[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Draw percentile lines (always visible)
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
      ctx.moveTo(scaleX(0, maxDays), scaleY(startPrice));
      ctx.lineTo(scaleX(maxDays - 1, maxDays), scaleY(value));
      ctx.stroke();
    }

    // Draw legend
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = isDarkMode ? '#e4e4e7' : '#09090b';
    let legendX = padding + 15;
    const legendY = padding - 15;

    for (const { color, label, value } of percentiles) {
      ctx.fillStyle = color;
      ctx.fillRect(legendX, legendY - 10, 14, 14);
      ctx.fillStyle = isDarkMode ? '#e4e4e7' : '#09090b';
      ctx.fillText(`${label}: $${value.toFixed(2)}`, legendX + 20, legendY);
      legendX += 200;
    }
  }, [chartData, isDarkMode]);

  // Handle resize
  useEffect(() => {
    if (!canvasRef.current || !chartData) return;

    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const width = containerRef.current.clientWidth - 20;
      canvasRef.current.width = width;
      canvasRef.current.height = 400;
      drawChart();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [chartData, drawChart]);

  // Fetch data
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
    return () => { isMounted = false; };
  }, [isOpen, forecast]);

  // Draw on data change
  useEffect(() => {
    if (chartData && canvasRef.current) {
      const width = containerRef.current?.clientWidth || 600;
      canvasRef.current.width = width - 20;
      canvasRef.current.height = 400;
      drawChart();
    }
  }, [chartData, drawChart]);

  if (!isOpen || !forecast) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className={`rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto my-auto transition-colors duration-300 ${
        isDarkMode ? "bg-zinc-800" : "bg-white"
      }`}>
        <div className={`sticky top-0 p-6 flex justify-between items-center z-10 border-b transition-colors duration-300 ${
          isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-zinc-200"
        }`}>
          <div>
            <h2 className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-zinc-900"}`}>
              {forecast.stock.symbol} Forecast
            </h2>
            <p className={`text-sm mt-1 ${isDarkMode ? "text-zinc-400" : "text-zinc-600"}`}>
              {forecast.horizon_days} days • {forecast.paths.toLocaleString()} simulations
            </p>
          </div>
          <button
            onClick={onClose}
            className={`text-3xl font-bold leading-none ${isDarkMode ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-500 hover:text-zinc-700"}`}
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex flex-col justify-center items-center h-96 gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className={`font-medium ${isDarkMode ? "text-zinc-200" : "text-zinc-700"}`}>Loading chart...</p>
            </div>
          )}

          {error && (
            <div className={`border rounded p-4 ${isDarkMode ? "bg-red-900 border-red-700 text-red-200" : "bg-red-50 border-red-200 text-red-700"}`}>
              Error: {error}
            </div>
          )}

          {!loading && !error && chartData && (
            <>
              <div ref={containerRef} className={`border rounded overflow-hidden ${isDarkMode ? "border-zinc-700 bg-zinc-900" : "border-zinc-200"}`}>
                <canvas ref={canvasRef} style={{ display: 'block', width: '100%' }} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-6 border-t" style={{borderTopColor: isDarkMode ? '#52525b' : '#e4e4e7'}}>
                <div className={`p-4 rounded ${isDarkMode ? "bg-red-900" : "bg-red-50"}`}>
                  <p className={`text-sm font-semibold ${isDarkMode ? "text-red-200" : "text-red-600"}`}>5th Percentile</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? "text-red-200" : "text-red-700"}`}>${chartData.p5.toFixed(2)}</p>
                </div>
                <div className={`p-4 rounded ${isDarkMode ? "bg-yellow-900" : "bg-yellow-50"}`}>
                  <p className={`text-sm font-semibold ${isDarkMode ? "text-yellow-200" : "text-yellow-600"}`}>Median</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? "text-yellow-200" : "text-yellow-700"}`}>${chartData.p50.toFixed(2)}</p>
                </div>
                <div className={`p-4 rounded ${isDarkMode ? "bg-green-900" : "bg-green-50"}`}>
                  <p className={`text-sm font-semibold ${isDarkMode ? "text-green-200" : "text-green-600"}`}>95th Percentile</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? "text-green-200" : "text-green-700"}`}>${chartData.p95.toFixed(2)}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
