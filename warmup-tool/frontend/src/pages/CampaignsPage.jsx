import { useEffect, useState } from 'react';
import { Plus, Zap, Pause, Play, Trash2, Loader, Calendar, TrendingUp } from 'lucide-react';
import api from '../utils/api';

function CreateCampaignModal({ accounts, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', accountId: '', dailyTarget: 10, rampUpDays: 30,
    schedule: { startHour: 8, endHour: 18, days: [1,2,3,4,5] }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleDay = (day) => {
    setForm(f => ({
      ...f,
      schedule: {
        ...f.schedule,
        days: f.schedule.days.includes(day)
          ? f.schedule.days.filter(d => d !== day)
          : [...f.schedule.days, day].sort()
      }
    }));
  };

  const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/warmup/campaigns', form);
      onCreated(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  // Calculate ramp-up preview
  const getRampPreview = () => {
    const days = [1, 7, 14, 21, 30];
    return days.map(day => {
      const progress = Math.min(day, form.rampUpDays) / form.rampUpDays;
      const count = Math.max(2, Math.floor(form.dailyTarget * Math.pow(progress, 1.5)));
      return { day, count };
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-lg p-6 animate-slide-up">
        <h2 className="font-display font-bold text-white text-xl mb-5">Create Warmup Campaign</h2>

        <div className="space-y-4">
          <div>
            <label className="label">Campaign Name</label>
            <input
              className="input-field"
              placeholder="My Gmail Warmup"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Email Account</label>
            <select
              className="input-field"
              value={form.accountId}
              onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
            >
              <option value="">Select an account...</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.email} ({a.provider})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Max Daily Emails</label>
              <input
                className="input-field"
                type="number"
                min={5}
                max={200}
                value={form.dailyTarget}
                onChange={e => setForm(f => ({ ...f, dailyTarget: parseInt(e.target.value) }))}
              />
              <p className="text-xs text-zinc-600 mt-1">Target at ramp-up completion</p>
            </div>
            <div>
              <label className="label">Ramp-up Period (days)</label>
              <input
                className="input-field"
                type="number"
                min={7}
                max={90}
                value={form.rampUpDays}
                onChange={e => setForm(f => ({ ...f, rampUpDays: parseInt(e.target.value) }))}
              />
            </div>
          </div>

          {/* Ramp preview */}
          <div className="p-3 bg-surface-1 rounded-xl border border-white/5">
            <div className="text-xs text-zinc-500 mb-2">Ramp-up Preview</div>
            <div className="flex gap-2">
              {getRampPreview().map(({ day, count }) => (
                <div key={day} className="flex-1 text-center">
                  <div className="text-sm font-bold text-brand-400">{count}</div>
                  <div className="text-xs text-zinc-600">Day {day}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Active Days</label>
            <div className="flex gap-2">
              {dayLabels.map((label, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={`w-9 h-9 rounded-lg text-xs font-medium transition-all ${
                    form.schedule.days.includes(i)
                      ? 'bg-brand-600/30 text-brand-300 border border-brand-500/30'
                      : 'bg-surface-1 text-zinc-600 border border-white/5'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Hour</label>
              <input
                className="input-field"
                type="number"
                min={0}
                max={23}
                value={form.schedule.startHour}
                onChange={e => setForm(f => ({ ...f, schedule: { ...f.schedule, startHour: parseInt(e.target.value) } }))}
              />
            </div>
            <div>
              <label className="label">End Hour</label>
              <input
                className="input-field"
                type="number"
                min={0}
                max={23}
                value={form.schedule.endHour}
                onChange={e => setForm(f => ({ ...f, schedule: { ...f.schedule, endHour: parseInt(e.target.value) } }))}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button
              onClick={handleCreate}
              disabled={loading || !form.name || !form.accountId}
              className="btn-primary flex-1 justify-center disabled:opacity-50"
            >
              {loading ? <Loader size={15} className="animate-spin" /> : <Zap size={15} />}
              {loading ? 'Creating...' : 'Start Campaign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [campaignsRes, accountsRes] = await Promise.all([
        api.get('/warmup/campaigns'),
        api.get('/accounts')
      ]);
      setCampaigns(campaignsRes.data);
      setAccounts(accountsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      const res = await api.patch(`/warmup/campaigns/${id}`, { status: newStatus });
      setCampaigns(c => c.map(campaign => campaign.id === id ? { ...campaign, status: newStatus } : campaign));
    } catch (err) {
      alert('Failed to update campaign status');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this campaign and all its data?')) return;
    try {
      await api.delete(`/warmup/campaigns/${id}`);
      setCampaigns(c => c.filter(campaign => campaign.id !== id));
    } catch (err) {
      alert('Failed to delete campaign');
    }
  };

  const getProgress = (campaign) => {
    return Math.min(100, Math.round((campaign.current_day / campaign.ramp_up_days) * 100));
  };

  const getReplyRate = (campaign) => {
    if (!campaign.total_sent) return 0;
    return Math.round((campaign.total_replied / campaign.total_sent) * 100);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Campaigns</h1>
          <p className="text-zinc-500 mt-1">Manage your email warmup campaigns</p>
        </div>
        <button
          onClick={() => accounts.length > 0 ? setShowModal(true) : alert('Add an email account first')}
          className="btn-primary"
        >
          <Plus size={16} /> New Campaign
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader size={24} className="animate-spin text-brand-500" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Zap size={48} className="text-zinc-700 mx-auto mb-4" />
          <h3 className="font-display font-bold text-white text-lg mb-2">No campaigns yet</h3>
          <p className="text-zinc-500 text-sm mb-6">
            {accounts.length === 0
              ? 'First connect an email account, then create a warmup campaign'
              : 'Create your first campaign to start warming up your email reputation'}
          </p>
          {accounts.length > 0 && (
            <button onClick={() => setShowModal(true)} className="btn-primary mx-auto">
              <Plus size={16} /> Create Campaign
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map(campaign => (
            <div key={campaign.id} className="glass-card p-6 hover:border-white/10 transition-all">
              <div className="flex items-start gap-4">
                <div className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 ${
                  campaign.status === 'active' ? 'bg-emerald-400 shadow-lg shadow-emerald-500/30' :
                  campaign.status === 'paused' ? 'bg-amber-400' : 'bg-zinc-500'
                }`} />

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-medium text-white text-lg">{campaign.name}</h3>
                    <span className={`badge ${
                      campaign.status === 'active' ? 'badge-green' :
                      campaign.status === 'paused' ? 'badge-yellow' : 'badge-blue'
                    }`}>
                      {campaign.status}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500">{campaign.account_email} · {campaign.provider}</p>

                  {/* Progress bar */}
                  <div className="mt-4 mb-3">
                    <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                      <span>Warmup Progress — Day {campaign.current_day} of {campaign.ramp_up_days}</span>
                      <span>{getProgress(campaign)}%</span>
                    </div>
                    <div className="h-1.5 bg-surface-1 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all"
                        style={{ width: `${getProgress(campaign)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { label: 'Sent', value: campaign.total_sent, icon: '📤' },
                      { label: 'Received', value: campaign.total_received, icon: '📥' },
                      { label: 'Replies', value: campaign.total_replied, icon: '↩️' },
                      { label: 'Reply Rate', value: `${getReplyRate(campaign)}%`, icon: '📊' },
                    ].map(({ label, value, icon }) => (
                      <div key={label} className="bg-surface-1 rounded-xl p-3">
                        <div className="text-base mb-1">{icon}</div>
                        <div className="text-sm font-bold text-white">{value}</div>
                        <div className="text-xs text-zinc-500">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleStatus(campaign.id, campaign.status)}
                    className="btn-secondary px-3"
                    title={campaign.status === 'active' ? 'Pause' : 'Resume'}
                  >
                    {campaign.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button
                    onClick={() => handleDelete(campaign.id)}
                    className="btn-danger px-3"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <CreateCampaignModal
          accounts={accounts}
          onClose={() => setShowModal(false)}
          onCreated={(campaign) => {
            setCampaigns(c => [campaign, ...c]);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}
