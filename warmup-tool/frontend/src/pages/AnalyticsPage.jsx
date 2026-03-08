import { useEffect, useState } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { BarChart3, TrendingUp, Shield, Inbox, Loader } from 'lucide-react';
import api from '../utils/api';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="glass-card p-3 text-xs shadow-xl border border-white/10">
        <div className="text-zinc-400 mb-2 font-medium">{label}</div>
        {payload.map(p => (
          <div key={p.name} className="flex gap-2 items-center mb-1">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-zinc-400">{p.name}:</span>
            <span className="text-white font-semibold">{typeof p.value === 'number' ? p.value.toFixed(p.name.includes('%') ? 1 : 0) : p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const [overview, setOverview] = useState({ daily: [], totals: {} });
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [days]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, accountsRes] = await Promise.all([
        api.get(`/analytics/overview?days=${days}`),
        api.get('/accounts')
      ]);
      setOverview(overviewRes.data);
      setAccounts(accountsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = overview.daily.map(d => ({
    date: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    Sent: parseInt(d.emails_sent) || 0,
    Received: parseInt(d.emails_received) || 0,
    Replied: parseInt(d.emails_replied) || 0,
    'Spam': parseInt(d.spam_count) || 0,
    'Inbox Rate %': parseFloat(d.inbox_rate) || 0,
    'Reputation': parseInt(d.reputation_score) || 0,
  }));

  const totals = overview.totals || {};

  const statCards = [
    { label: 'Total Sent', value: parseInt(totals.total_sent || 0).toLocaleString(), icon: '📤', color: 'text-brand-400' },
    { label: 'Total Received', value: parseInt(totals.total_received || 0).toLocaleString(), icon: '📥', color: 'text-emerald-400' },
    { label: 'Total Replies', value: parseInt(totals.total_replied || 0).toLocaleString(), icon: '↩️', color: 'text-amber-400' },
    { label: 'Spam Detected', value: parseInt(totals.total_spam || 0).toLocaleString(), icon: '🚫', color: 'text-red-400' },
    { label: 'Avg Inbox Rate', value: `${parseFloat(totals.avg_inbox_rate || 0).toFixed(1)}%`, icon: '📊', color: 'text-purple-400' },
    { label: 'Avg Reputation', value: `${Math.round(totals.avg_reputation || 0)}%`, icon: '🛡️', color: 'text-cyan-400' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Analytics</h1>
          <p className="text-zinc-500 mt-1">Track your email warmup performance</p>
        </div>

        <div className="flex gap-3">
          <select
            className="input-field w-auto"
            value={days}
            onChange={e => setDays(parseInt(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader size={24} className="animate-spin text-brand-500" />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-6 gap-3 mb-6">
            {statCards.map(({ label, value, icon, color }) => (
              <div key={label} className="glass-card p-4 text-center">
                <div className="text-2xl mb-1">{icon}</div>
                <div className={`text-xl font-display font-bold ${color}`}>{value}</div>
                <div className="text-xs text-zinc-500 mt-1">{label}</div>
              </div>
            ))}
          </div>

          {chartData.length === 0 ? (
            <div className="glass-card p-16 text-center">
              <BarChart3 size={48} className="text-zinc-700 mx-auto mb-4" />
              <h3 className="font-display font-bold text-white mb-2">No data yet</h3>
              <p className="text-zinc-500 text-sm">Start a warmup campaign to see analytics here</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {/* Email Volume Chart */}
              <div className="glass-card p-5 col-span-2">
                <h3 className="font-display font-bold text-white mb-1">Email Volume</h3>
                <p className="text-xs text-zinc-500 mb-5">Sent, received and replied over time</p>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6272f0" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6272f0" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorReplied" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" />
                    <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                    <Area type="monotone" dataKey="Sent" stroke="#6272f0" fill="url(#colorSent)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="Replied" stroke="#34d399" fill="url(#colorReplied)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Reputation Score */}
              <div className="glass-card p-5">
                <h3 className="font-display font-bold text-white mb-1">Reputation Score</h3>
                <p className="text-xs text-zinc-500 mb-5">Domain reputation over time</p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" />
                    <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="Reputation" stroke="#a78bfa" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Spam vs Inbox */}
              <div className="glass-card p-5">
                <h3 className="font-display font-bold text-white mb-1">Spam Detection</h3>
                <p className="text-xs text-zinc-500 mb-5">Emails caught in spam per day</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" />
                    <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Spam" fill="#f87171" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
