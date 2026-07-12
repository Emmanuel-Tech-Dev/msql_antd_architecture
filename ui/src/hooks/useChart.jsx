import { useCallback } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DEFAULT_COLORS = ["#1677ff", "#52c41a", "#faad14", "#ff4d4f", "#722ed1"];
const DEFAULT_MARGIN = { top: 8, right: 12, left: -12, bottom: 0 };

function normalizeSeries(series = [], fallbackKey = "value") {
  if (Array.isArray(series) && series.length) {
    return series.map((item, index) =>
      typeof item === "string"
        ? { dataKey: item, name: item, color: DEFAULT_COLORS[index % DEFAULT_COLORS.length] }
        : {
          ...item,
          name: item.name || item.dataKey,
          color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
        },
    );
  }

  return [{ dataKey: fallbackKey, name: fallbackKey, color: DEFAULT_COLORS[0] }];
}

function ChartFrame({ height, children }) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function CommonParts({ xKey, showGrid, showXAxis, showYAxis, showTooltip, showLegend, tooltipFormatter }) {
  return (
    <>
      {showGrid && <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" vertical={false} />}
      {showXAxis && <XAxis dataKey={xKey} tickLine={false} axisLine={false} fontSize={12} />}
      {showYAxis && <YAxis tickLine={false} axisLine={false} fontSize={12} />}
      {showTooltip && <Tooltip formatter={tooltipFormatter} />}
      {showLegend && <Legend />}
    </>
  );
}

function ChartRenderer(options) {
  const {
    type = "line",
    data = [],
    xKey = "name",
    dataKey = "value",
    nameKey = "name",
    series,
    colors = DEFAULT_COLORS,
    height = 260,
    margin = DEFAULT_MARGIN,
    showGrid = true,
    showXAxis = true,
    showYAxis = true,
    showTooltip = true,
    showLegend = false,
    tooltipFormatter,
    innerRadius = 56,
    outerRadius = 86,
  } = options;

  const chartSeries = normalizeSeries(series, dataKey);
  const common = {
    xKey,
    showGrid,
    showXAxis,
    showYAxis,
    showTooltip,
    showLegend,
    tooltipFormatter,
  };

  if (type === "pie") {
    return (
      <ChartFrame height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey={dataKey}
            nameKey={nameKey}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell key={entry.key || entry[nameKey] || index} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          {showTooltip && <Tooltip formatter={tooltipFormatter} />}
          {showLegend && <Legend />}
        </PieChart>
      </ChartFrame>
    );
  }

  if (type === "bar") {
    return (
      <ChartFrame height={height}>
        <BarChart data={data} margin={margin}>
          <CommonParts {...common} />
          {chartSeries.map((item) => (
            <Bar key={item.dataKey} dataKey={item.dataKey} name={item.name} fill={item.color} radius={[6, 6, 0, 0]}>
              {typeof item.cellColor === "function" &&
                data.map((entry, index) => (
                  <Cell key={`${item.dataKey}-${index}`} fill={item.cellColor(entry)} />
                ))}
            </Bar>
          ))}
        </BarChart>
      </ChartFrame>
    );
  }

  if (type === "area") {
    return (
      <ChartFrame height={height}>
        <AreaChart data={data} margin={margin}>
          <CommonParts {...common} />
          {chartSeries.map((item) => (
            <Area
              key={item.dataKey}
              type="monotone"
              dataKey={item.dataKey}
              name={item.name}
              stroke={item.color}
              fill={item.color}
              fillOpacity={item.fillOpacity ?? 0.12}
            />
          ))}
        </AreaChart>
      </ChartFrame>
    );
  }

  if (type === "composed") {
    return (
      <ChartFrame height={height}>
        <ComposedChart data={data} margin={margin}>
          <CommonParts {...common} />
          {chartSeries.map((item) =>
            item.chart === "bar" ? (
              <Bar key={item.dataKey} dataKey={item.dataKey} name={item.name} fill={item.color} radius={[6, 6, 0, 0]} />
            ) : (
              <Line
                key={item.dataKey}
                type="monotone"
                dataKey={item.dataKey}
                name={item.name}
                stroke={item.color}
                strokeWidth={item.strokeWidth ?? 2}
                dot={item.dot ?? false}
              />
            ),
          )}
        </ComposedChart>
      </ChartFrame>
    );
  }

  return (
    <ChartFrame height={height}>
      <LineChart data={data} margin={margin}>
        <CommonParts {...common} />
        {chartSeries.map((item) => (
          <Line
            key={item.dataKey}
            type="monotone"
            dataKey={item.dataKey}
            name={item.name}
            stroke={item.color}
            strokeWidth={item.strokeWidth ?? 2}
            dot={item.dot ?? false}
          />
        ))}
      </LineChart>
    </ChartFrame>
  );
}

export default function useChart(defaultOptions = {}) {
  const renderChart = useCallback(
    (options = {}) => <ChartRenderer {...defaultOptions} {...options} />,
    [defaultOptions],
  );

  return {
    renderChart,
    Chart: ChartRenderer,
    chartTypes: ["line", "bar", "pie", "area", "composed"],
  };
}
