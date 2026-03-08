import { useEffect, useState } from 'react';
import { Plus, Mail, Trash2, CheckCircle, XCircle, Loader, Wifi, Shield } from 'lucide-react';
import api from '../utils/api';

const PROVIDERS = [
  { value: 'gmail', label: 'Gmail', host: 'smtp.gmail.com', imap: 'imap.gmail.com' },
  { value: 'outlook', label: 'Outlook / Microsoft', host: 'smtp.office365.com', imap: 'outlook.office365.com' },
  { value: 'custom', label: 'Custom SMTP/IMAP', host: '', imap: '' },
];

function AddAccountModal({ onClose, onAdded }) {
  const [form, setForm] = useState({
    email: '', provider: 'gmail', username: '', password: '',
    displayName: '', smtpHost: '', smtpPort: 587, imapHost: '', imapPort: 993
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedProvider = PROVIDERS.find(p => p.value === form.provider);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        smtpHost: form.provider !== 'custom' ? selectedProvider.host : form.smtpHost,
        imapHost: form.provider !== 'custom' ? selectedProvider.imap : form.imapHost,
        username: form.username || form.email
      };
      const res = await api.post('/accounts', payload);
      onAdded(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-md p-6 animate-slide-up">
        <h2 className="font-display font-bold text-white text-xl mb-5">Connect Email Account</h2>

        <div className="space-y-4">
          <div>
            <label className="label">Provider</label>
            <div className="grid grid-cols-3 gap-2">
              {PROVIDERS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setForm(f => ({ ...f, provider: p.value }))}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                    form.provider === p.value
                      ? 'border-brand-500/50 bg-brand-500/15 text-brand-300'
                      : 'border-white/10 bg-surface-1 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Email Address</label>
            <input
              className="input-field"
              placeholder="you@gmail.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value, username: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Display Name (optional)</label>
            <input
              className="input-field"
              placeholder="John Doe"
              value={form.displayName}
              onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
            />
          </div>

          {form.provider === 'gmail' && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
              ⚠️ For Gmail, use an <strong>App Password</strong> (not your regular password). Enable 2FA first, then go to Google Account → Security → App Passwords.
            </div>
          )}

          <div>
            <label className="label">
              {form.provider === 'gmail' ? 'App Password' : 'Password'}
            </label>
            <input
              className="input-field"
              type="password"
              placeholder="••••••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            />
          </div>

          {form.provider === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">SMTP Host</label>
                <input className="input-field" placeholder="smtp.example.com" value={form.smtpHost} onChange={e => setForm(f => ({ ...f, smtpHost: e.target.value }))} />
              </div>
              <div>
                <label className="label">SMTP Port</label>
                <input className="input-field" type="number" value={form.smtpPort} onChange={e => setForm(f => ({ ...f, smtpPort: parseInt(e.target.value) }))} />
              </div>
              <div>
                <label className="label">IMAP Host</label>
                <input className="input-field" placeholder="imap.example.com" value={form.imapHost} onChange={e => setForm(f => ({ ...f, imapHost: e.target.value }))} />
              </div>
              <div>
                <label className="label">IMAP Port</label>
                <input className="input-field" type="number" value={form.imapPort} onChange={e => setForm(f => ({ ...f, imapPort: parseInt(e.target.value) }))} />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={loading || !form.email || !form.password}
              className="btn-primary flex-1 justify-center disabled:opacity-50"
            >
              {loading ? <Loader size={15} className="animate-spin" /> : <Plus size={15} />}
              {loading ? 'Testing...' : 'Connect Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [testing, setTesting] = useState(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this account? Active campaigns using it will stop.')) return;
    try {
      await api.delete(`/accounts/${id}`);
      setAccounts(a => a.filter(acc => acc.id !== id));
    } catch (err) {
      alert('Failed to delete account');
    }
  };

  const handleTest = async (id) => {
    setTesting(id);
    try {
      const res = await api.post(`/accounts/${id}/test`);
      alert(res.data.success ? '✅ Connection successful!' : `❌ ${res.data.error}`);
    } catch (err) {
      alert('❌ Connection test failed');
    } finally {
      setTesting(null);
    }
  };

  const reputationColor = (score) => {
    if (score >= 70) return 'text-emerald-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Email Accounts</h1>
          <p className="text-zinc-500 mt-1">Connect accounts to start warming up</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> Connect Account
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader size={24} className="animate-spin text-brand-500" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Mail size={48} className="text-zinc-700 mx-auto mb-4" />
          <h3 className="font-display font-bold text-white text-lg mb-2">No accounts connected</h3>
          <p className="text-zinc-500 text-sm mb-6">Connect your first email account to start warming up your sender reputation</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mx-auto">
            <Plus size={16} /> Connect Account
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map(account => (
            <div key={account.id} className="glass-card p-5 flex items-center gap-4 hover:border-white/10 transition-all">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-purple-700 flex items-center justify-center text-sm font-bold text-white">
                {account.email.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-zinc-200">{account.email}</span>
                  <span className="badge badge-blue">{account.provider}</span>
                </div>
                <div className="text-sm text-zinc-500 mt-0.5">
                  {account.smtp_host} · IMAP {account.imap_host}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className={`text-lg font-display font-bold ${reputationColor(account.reputation_score)}`}>
                    {account.reputation_score}%
                  </div>
                  <div className="text-xs text-zinc-600">Reputation</div>
                </div>

                <div className={`w-2 h-2 rounded-full ${account.status === 'active' ? 'bg-emerald-400' : 'bg-zinc-600'}`} />

                <button
                  onClick={() => handleTest(account.id)}
                  disabled={testing === account.id}
                  className="btn-secondary px-3"
                  title="Test connection"
                >
                  {testing === account.id ? <Loader size={14} className="animate-spin" /> : <Wifi size={14} />}
                </button>

                <button
                  onClick={() => handleDelete(account.id)}
                  className="btn-danger px-3"
                  title="Remove account"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AddAccountModal
          onClose={() => setShowModal(false)}
          onAdded={(account) => {
            setAccounts(a => [account, ...a]);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}
