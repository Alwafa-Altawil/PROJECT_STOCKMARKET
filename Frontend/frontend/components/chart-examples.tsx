/**
 * Chart Implementation Examples
 * 
 * Copy and adapt these examples for your use case
 */

'use client';

import React, { useState } from 'react';
import { Forecast } from '@/types';

// ============================================================================
// EXAMPLE 1: Simple Usage with Auto-Config
// ============================================================================
export function Example1_AutoConfig() {
  const [isOpen, setIsOpen] = useState(false);
  const [forecast, setForecast] = useState<Forecast | null>(null);

  const handleViewForecast = async (forecastId: number) => {
    // Fetch the forecast data
    const response = await fetch(`/api/forecasts/${forecastId}/`);
    const data = await response.json();
    setForecast(data);
    setIsOpen(true);
  };

  // Dynamically import and render the configured chart
  const [ForecastModal, setForecastModal] = React.useState<any>(null);

  React.useEffect(() => {
    import('@/components/chart-config').then((mod) => {
      setForecastModal(() => mod.ForecastModal);
    });
  }, []);

  if (!ForecastModal) return <div>Loading...</div>;

  return (
    <div>
      <button onClick={() => handleViewForecast(1)}>
        View Forecast
      </button>
      <ForecastModal
        forecast={forecast}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}

// ============================================================================
// EXAMPLE 2: Explicit Component Selection
// ============================================================================
export function Example2_ExplicitSelection() {
  const [isOpen, setIsOpen] = useState(false);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [chartType, setChartType] = useState<'ultra-light' | 'progressive' | 'lightweight'>(
    'ultra-light'
  );

  const handleViewForecast = async (forecastId: number) => {
    const response = await fetch(`/api/forecasts/${forecastId}/`);
    const data = await response.json();
    setForecast(data);
    setIsOpen(true);
  };

  // Dynamic import based on selection
  const [Component, setComponent] = React.useState<any>(null);

  React.useEffect(() => {
    let importPath = '';
    switch (chartType) {
      case 'progressive':
        importPath = '@/components/ForecastModalProgressive';
        break;
      case 'lightweight':
        importPath = '@/components/ForecastModalOptimized';
        break;
      case 'ultra-light':
      default:
        importPath = '@/components/ForecastModalUltraLight';
    }

    import(importPath).then((mod) => {
      setComponent(() =>
        chartType === 'progressive'
          ? mod.ForecastModalProgressive
          : chartType === 'lightweight'
            ? mod.ForecastModalOptimized
            : mod.ForecastModalUltraLight
      );
    });
  }, [chartType]);

  if (!Component) return <div>Loading...</div>;

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setChartType('ultra-light')}
          className={chartType === 'ultra-light' ? 'font-bold' : ''}
        >
          Ultra-Light
        </button>
        <button
          onClick={() => setChartType('progressive')}
          className={chartType === 'progressive' ? 'font-bold' : ''}
        >
          Progressive
        </button>
        <button
          onClick={() => setChartType('lightweight')}
          className={chartType === 'lightweight' ? 'font-bold' : ''}
        >
          Lightweight
        </button>
      </div>

      <button onClick={() => handleViewForecast(1)}>
        View Forecast
      </button>

      <Component
        forecast={forecast}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}

// ============================================================================
// EXAMPLE 3: Responsive Chart Selection
// ============================================================================
export function Example3_ResponsiveSelection() {
  const [isOpen, setIsOpen] = useState(false);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // On mobile: use ultra-light (fastest)
  // On desktop: use progressive (better UX)
  const chartType = isMobile ? 'ultra-light' : 'progressive';

  const [Component, setComponent] = React.useState<any>(null);

  React.useEffect(() => {
    const importPath =
      chartType === 'progressive'
        ? '@/components/ForecastModalProgressive'
        : '@/components/ForecastModalUltraLight';

    import(importPath).then((mod) => {
      setComponent(() =>
        chartType === 'progressive'
          ? mod.ForecastModalProgressive
          : mod.ForecastModalUltraLight
      );
    });
  }, [chartType]);

  const handleViewForecast = async (forecastId: number) => {
    const response = await fetch(`/api/forecasts/${forecastId}/`);
    const data = await response.json();
    setForecast(data);
    setIsOpen(true);
  };

  if (!Component) return <div>Loading...</div>;

  return (
    <div>
      <p className="text-sm text-zinc-600">
        Chart type: {isMobile ? '📱 Mobile (Ultra-Light)' : '🖥️ Desktop (Progressive)'}
      </p>
      <button onClick={() => handleViewForecast(1)}>
        View Forecast
      </button>
      <Component
        forecast={forecast}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: With Performance Monitoring
// ============================================================================
export function Example4_WithMonitoring() {
  const [isOpen, setIsOpen] = useState(false);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [metrics, setMetrics] = useState<{
    loadTime: number;
    renderTime: number;
    memoryUsed: number;
  } | null>(null);

  const handleViewForecast = async (forecastId: number) => {
    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

    const response = await fetch(`/api/forecasts/${forecastId}/`);
    const data = await response.json();

    const loadTime = performance.now() - startTime;
    const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryUsed = Math.abs(endMemory - startMemory) / 1024 / 1024;

    setMetrics({
      loadTime,
      renderTime: 0,
      memoryUsed,
    });

    setForecast(data);
    setIsOpen(true);
  };

  // Import the configured chart
  const [Component, setComponent] = React.useState<any>(null);

  React.useEffect(() => {
    import('@/components/chart-config').then((mod) => {
      setComponent(() => mod.ForecastModal);
    });
  }, []);

  if (!Component) return <div>Loading...</div>;

  return (
    <div>
      <button onClick={() => handleViewForecast(1)}>
        View Forecast
      </button>

      {metrics && (
        <div className="mt-4 p-4 bg-blue-50 rounded">
          <p className="text-sm text-blue-700">
            ⚡ Load time: {metrics.loadTime.toFixed(0)}ms
          </p>
          <p className="text-sm text-blue-700">
            💾 Memory used: {metrics.memoryUsed.toFixed(2)}MB
          </p>
        </div>
      )}

      <Component
        forecast={forecast}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}

// ============================================================================
// EXAMPLE 5: In a Forecast List with Quick View
// ============================================================================
export function Example5_ForecastList() {
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [selectedForecast, setSelectedForecast] = useState<Forecast | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  React.useEffect(() => {
    // Fetch all forecasts
    fetch('/api/forecasts/')
      .then((r) => r.json())
      .then(setForecasts);
  }, []);

  // Import the configured chart
  const [Component, setComponent] = React.useState<any>(null);

  React.useEffect(() => {
    import('@/components/chart-config').then((mod) => {
      setComponent(() => mod.ForecastModal);
    });
  }, []);

  if (!Component) return <div>Loading...</div>;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {forecasts.map((forecast) => (
          <div
            key={forecast.id}
            className="border border-zinc-200 rounded p-4 hover:shadow-lg transition"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold">{forecast.stock.symbol}</h3>
                <p className="text-sm text-zinc-600">
                  Horizon: {forecast.horizon_days} days
                </p>
                <p className="text-sm text-zinc-600">
                  Median: ${forecast.median}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedForecast(forecast);
                  setIsOpen(true);
                }}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
              >
                View Chart
              </button>
            </div>
          </div>
        ))}
      </div>

      <Component
        forecast={selectedForecast}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}

// ============================================================================
// EXAMPLE 6: Direct Import (Simplest)
// ============================================================================
import { ForecastModalUltraLight } from '@/components/ForecastModalUltraLight';

export function Example6_DirectImport() {
  const [isOpen, setIsOpen] = useState(false);
  const [forecast, setForecast] = useState<Forecast | null>(null);

  const handleViewForecast = async (forecastId: number) => {
    const response = await fetch(`/api/forecasts/${forecastId}/`);
    const data = await response.json();
    setForecast(data);
    setIsOpen(true);
  };

  return (
    <div>
      <button onClick={() => handleViewForecast(1)}>
        View Forecast
      </button>
      <ForecastModalUltraLight
        forecast={forecast}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}

// ============================================================================
// Usage Guide:
// ============================================================================
/*
RECOMMENDED APPROACH:

1. For most applications:
   Use Example1_AutoConfig() - simplest, uses configured strategy

2. For developer choice:
   Use Example2_ExplicitSelection() - let users choose

3. For mobile optimization:
   Use Example3_ResponsiveSelection() - auto-optimize

4. For monitoring:
   Use Example4_WithMonitoring() - track performance

5. In list views:
   Use Example5_ForecastList() - show forecasts with quick view

6. For simple cases:
   Use Example6_DirectImport() - most direct approach

Set NEXT_PUBLIC_CHART_STRATEGY in .env.local to control:
- 'ultra-light' (recommended)
- 'progressive'
- 'lightweight'
*/
