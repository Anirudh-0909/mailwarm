import { useEffect, useState } from 'react';
import { Mail, Zap, TrendingUp, Shield, ArrowUpRight, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../utils/api';

function StatCard({ icon: Icon, label, value, sub, color = 'brand' }) {
  const colors = {
    brand: 'text-brand-400 bg-brand-500/10',
    green: 'text-emerald-400 bg-emerald-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    purple: 'text-purple-400 bg-purple-500/10'
  };

  return (
    <div className="stat-card animate-slide-up">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl ${colors[color]}`}>
          <Icon size={18} />
        </div>
        <ArrowUpRight size={14} className="text-zinc-600" />
      </div>
      <div>
        <div className="text-2xl font-display font-bold text-white">{value}</div>
        <div className="text-sm text-zinc-400 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-zinc-600 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="glass-card p-3 text-xs shadow-xl">
        <div className="text-zinc-400 mb-2">{label}</div>
        {payload.map(p => (
          <div key={p.name} className="flex gap-2 items-center">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-zinc-300">{p.name}:</span>
            <span className="text-white font-medium">{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState({ daily: [], totals: {} });
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, analyticsRes, campaignsRes] = await Promise.all([
          api.get('/warmup/stats').catch(() => ({ data: {} })),
          api.get('/analytics/overview?days=14').catch(() => ({ data: { daily: [], totals: {} } })),
          api.get('/warmup/campaigns').catch(() => ({ data: [] }))
        ]);

        setStats(statsRes.data);
        setAnalytics(analyticsRes.data);
        setCampaigns(campaignsRes.data.slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const chartData = analytics.daily.map(d => ({
    date: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    Sent: parseInt(d.emails_sent) || 0,
    Replied: parseInt(d.emails_replied) || 0,
    Score: parseInt(d.reputation_score) || 0,
  }));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-500 mt-1">Monitor your email warmup performance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Zap}
          label="Active Campaigns"
          value={stats?.active_campaigns || 0}
          sub={`of ${stats?.total_campaigns || 0} total`}
          color="brand"
        />
        <StatCard
          icon={Mail}
          label="Emails Sent"
          value={stats?.total_emails_sent?.toLocaleString() || 0}
          sub="All time"
          color="green"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Replies"
          value={stats?.total_replies?.toLocaleString() || 0}
          sub="Auto-generated"
          color="amber"
        />
        <StatCard
          icon={Shield}
          label="Avg Reputation"
          value={`${Math.round(stats?.avg_reputation || 0)}%`}
          sub="Across all accounts"
          color="purple"
        />
      </div>

      {/* Chart */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display font-bold text-white">Activity Overview</h2>
            <p className="text-sm text-zinc-500 mt-0.5">Last 14 days</p>
          </div>
          <div className="flex gap-4 text-xs">
            {[
              { color: '#6272f0', label: 'Sent' },
              { color: '#34d399', label: 'Replied' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                <span className="text-zinc-400">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="Sent" stroke="#6272f0" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Replied" stroke="#34d399" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center">
            <div className="text-center">
              <Activity size={36} className="text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">No activity yet</p>
              <p className="text-zinc-600 text-xs mt-1">Add an email account and start a campaign</p>
            </div>
          </div>
        )}
      </div>

      {/* Recent Campaigns */}
      <div className="glass-card">
        <div className="p-5 border-b border-white/5">
          <h2 className="font-display font-bold text-white">Recent Campaigns</h2>
        </div>
        {campaigns.length === 0 ? (
          <div className="p-8 text-center">
            <Zap size={32} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No campaigns yet</p>
            <p className="text-zinc-600 text-xs mt-1">Go to Campaigns to create one</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {campaigns.map(c => (
              <div key={c.id} className="flex items-center gap-4 p-4 hover:bg-white/2 transition-colors">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  c.status === 'active' ? 'bg-emerald-400' : 
                  c.status === 'paused' ? 'bg-amber-400' : 'bg-zinc-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-200">{c.name}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{c.account_email}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-zinc-200">{c.total_sent} sent</div>
                  <div className="text-xs text-zinc-500">Day {c.current_day}/{c.ramp_up_days}</div>
                </div>
                <div className={`badge ${
                  c.status === 'active' ? 'badge-green' :
                  c.status === 'paused' ? 'badge-yellow' : 'badge-blue'
                }`}>
                  {c.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
