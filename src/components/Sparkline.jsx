import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

export default function Sparkline({ data }) {
  if (!data || data.length < 2) return null;

  const chartData = data.map((v, i) => ({ i, v }));

  return (
    <div style={{ width: '100%', height: 50, margin: '12px 0' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <YAxis domain={['dataMin - 10', 'dataMax + 10']} hide />
          <Line
            type="monotone"
            dataKey="v"
            stroke="#e8e4df"
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
