import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import axios from 'axios';
import { ChartConfig, useDatasetStore } from '../stores/datasetStore';
import { useThemeStore } from '../stores/themeStore';
import { Trash2, Settings, BarChart2 } from 'lucide-react';

interface ChartCardProps {
  config: ChartConfig;
  onRemove: (id: string) => void;
}

export const ChartCard: React.FC<ChartCardProps> = ({ config, onRemove }) => {
  const { activeDatasetId, globalFilters } = useDatasetStore();
  const { theme } = useThemeStore();
  const isStark = theme === 'stark';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeDatasetId) return;

    let isMounted = true;
    setLoading(true);

    axios.post(`/api/datasets/${activeDatasetId}/chart-data`, {
      config,
      filters: globalFilters
    }).then((res) => {
      if (isMounted) {
        setData(res.data);
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [activeDatasetId, config, globalFilters]);

  // Build ECharts option
  const getEChartOption = () => {
    if (!data) return {};

    const primaryColor = isStark ? '#00E5FF' : '#4F46E5';
    const secondaryColor = isStark ? '#2979FF' : '#06B6D4';
    const textColor = isStark ? '#7FA3C7' : '#64748B';
    const splitLineColor = isStark ? 'rgba(0,229,255,0.08)' : '#F1F5F9';

    if (config.chart_type === 'pie' || config.chart_type === 'donut') {
      return {
        tooltip: { trigger: 'item' },
        series: [
          {
            name: config.title,
            type: 'pie',
            radius: config.chart_type === 'donut' ? ['45%', '70%'] : '65%',
            data: data.data || [],
            itemStyle: {
              borderRadius: isStark ? 4 : 6,
              borderColor: isStark ? '#050B14' : '#fff',
              borderWidth: 2
            },
            label: { color: textColor, fontSize: 11 }
          }
        ]
      };
    }

    if (config.chart_type === 'scatter') {
      return {
        tooltip: { trigger: 'item' },
        xAxis: { type: 'value', name: data.x_label, splitLine: { lineStyle: { color: splitLineColor } }, axisLabel: { color: textColor } },
        yAxis: { type: 'value', name: data.y_label, splitLine: { lineStyle: { color: splitLineColor } }, axisLabel: { color: textColor } },
        series: [
          {
            type: 'scatter',
            symbolSize: 8,
            data: data.points || [],
            itemStyle: { color: primaryColor }
          }
        ]
      };
    }

    // Default: Bar / Column / Line / Histogram
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '8%', top: '10%', containLabel: true },
      xAxis: {
        type: 'category',
        data: data.categories || [],
        axisLabel: { color: textColor, fontSize: 10, rotate: 25 },
        axisLine: { lineStyle: { color: splitLineColor } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: textColor, fontSize: 10 },
        splitLine: { lineStyle: { color: splitLineColor } }
      },
      series: [
        {
          name: config.measure || 'Value',
          type: config.chart_type === 'line' ? 'line' : 'bar',
          data: (data.series && data.series[0]?.data) || [],
          itemStyle: {
            color: config.chart_type === 'line' ? primaryColor : (
              isStark 
                ? { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#00E5FF' }, { offset: 1, color: '#2979FF' }] }
                : primaryColor
            ),
            borderRadius: config.chart_type === 'line' ? 0 : [4, 4, 0, 0]
          },
          smooth: true,
          areaStyle: config.chart_type === 'line' && isStark ? {
            color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(0,229,255,0.3)' }, { offset: 1, color: 'transparent' }] }
          } : undefined
        }
      ]
    };
  };

  return (
    <div className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
      isStark ? 'hud-panel' : 'bg-white border-slate-200 shadow-xs'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h4 className={`text-xs font-bold truncate ${isStark ? 'text-[#00E5FF]' : 'text-slate-800'}`}>
          {config.title}
        </h4>
        <button
          onClick={() => onRemove(config.id)}
          className="text-slate-400 hover:text-red-500 transition-colors p-1"
          title="Remove Chart"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="h-60 flex items-center justify-center">
        {loading ? (
          <div className="text-xs text-slate-400 animate-pulse">Calculating data...</div>
        ) : config.chart_type === 'kpi' ? (
          <div className="text-center">
            <span className={`text-4xl font-extrabold ${isStark ? 'font-["Orbitron"] text-[#00E5FF]' : 'text-indigo-600'}`}>
              {typeof data?.value === 'number' ? data.value.toLocaleString() : data?.value}
            </span>
            <p className="text-xs text-slate-400 mt-1 uppercase font-semibold">
              {data?.measure} ({data?.aggregation})
            </p>
          </div>
        ) : (
          <ReactECharts
            option={getEChartOption()}
            style={{ width: '100%', height: '100%' }}
            opts={{ renderer: 'svg' }}
          />
        )}
      </div>
    </div>
  );
};
