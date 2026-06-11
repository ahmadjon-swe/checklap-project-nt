'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ShieldCheck, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { useT } from '../../lib/i18n';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

type Tab = 'password' | 'email' | '2fa' | 'delete';

function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 text-sm">
      <CheckCircle2 size={16} className="flex-shrink-0" />
      {message}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-400 text-sm">
      <AlertTriangle size={16} className="flex-shrink-0" />
      {message}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [tab, setTab] = useState<Tab>('password');

  // Password change
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdError, setPwdError] = useState('');

  // Email change
  const [newEmail, setNewEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailStep, setEmailStep] = useState<'form' | 'code'>('form');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState('');
  const [emailError, setEmailError] = useState('');

  // 2FA
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFASuccess, setTwoFASuccess] = useState('');

  // Delete
  const [deletePwd, setDeletePwd] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    // Fetch current user to get 2FA status
    api.get('/users/me').then((r) => {
      setTwoFAEnabled(r.data.data?.twoFactorEnabled ?? false);
    }).catch(() => {});
  }, [user, router]);

  // ---------- password ----------
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');
    if (newPwd !== confirmPwd) { setPwdError(t.profile.passwordMismatch); return; }
    setPwdLoading(true);
    try {
      await api.put('/users/me/password', { currentPassword: currentPwd, newPassword: newPwd });
      setPwdSuccess(t.profile.passwordSuccess);
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (err: any) {
      setPwdError(err.response?.data?.message || 'Error');
    } finally {
      setPwdLoading(false);
    }
  };

  // ---------- email ----------
  const handleSendEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setEmailLoading(true);
    try {
      await api.post('/auth/change-email', { newEmail });
      setEmailStep('code');
    } catch (err: any) {
      setEmailError(err.response?.data?.message || 'Error');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleConfirmEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setEmailLoading(true);
    try {
      await api.post('/auth/confirm-email-change', { code: emailCode });
      setEmailSuccess(t.profile.emailSuccess);
      setEmailStep('form');
      setNewEmail('');
      setEmailCode('');
    } catch (err: any) {
      setEmailError(err.response?.data?.message || 'Error');
    } finally {
      setEmailLoading(false);
    }
  };

  // ---------- 2FA ----------
  const handleToggle2FA = async () => {
    setTwoFALoading(true);
    setTwoFASuccess('');
    try {
      const res = await api.post('/auth/2fa/toggle', { enable: !twoFAEnabled });
      setTwoFAEnabled(res.data.data.twoFactorEnabled);
      setTwoFASuccess(res.data.data.twoFactorEnabled ? t.profile.twoFactorEnabled : t.profile.twoFactorDisabled);
    } catch {
      // ignore
    } finally {
      setTwoFALoading(false);
    }
  };

  // ---------- delete ----------
  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');
    setDeleteLoading(true);
    try {
      await api.delete('/auth/account', { data: { password: deletePwd } });
      clearAuth();
      router.push('/login');
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Error');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!user) return null;

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'password', label: t.profile.tabPassword, icon: Lock },
    { id: 'email', label: t.profile.tabEmail, icon: Mail },
    { id: '2fa', label: t.profile.tab2FA, icon: ShieldCheck },
    { id: 'delete', label: t.profile.tabDelete, icon: Trash2 },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 px-4 py-10">
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t.profile.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {user.firstName} {user.lastName} · {user.email}
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-8">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                tab === id
                  ? id === 'delete'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Password tab */}
        {tab === 'password' && (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Input
              id="currentPwd"
              label={t.profile.currentPassword}
              type="password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              placeholder="••••••••"
            />
            <Input
              id="newPwd"
              label={t.profile.newPassword}
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="••••••••"
            />
            <Input
              id="confirmPwd"
              label={t.profile.confirmPassword}
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              placeholder="••••••••"
            />
            {pwdError && <ErrorBanner message={pwdError} />}
            {pwdSuccess && <SuccessBanner message={pwdSuccess} />}
            <Button type="submit" disabled={pwdLoading} size="lg" className="w-full">
              {pwdLoading ? t.profile.changingPassword : t.profile.changePassword}
            </Button>
          </form>
        )}

        {/* Email tab */}
        {tab === 'email' && (
          <div className="space-y-4">
            {emailStep === 'form' ? (
              <form onSubmit={handleSendEmailCode} className="space-y-4">
                <Input
                  id="newEmail"
                  label={t.profile.newEmail}
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new@example.com"
                />
                {emailError && <ErrorBanner message={emailError} />}
                {emailSuccess && <SuccessBanner message={emailSuccess} />}
                <Button type="submit" disabled={emailLoading || !newEmail} size="lg" className="w-full">
                  {emailLoading ? t.profile.sending : t.profile.sendCode}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleConfirmEmail} className="space-y-4">
                <Input
                  id="emailCode"
                  label={t.profile.verificationCode}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                  placeholder="000000"
                />
                {emailError && <ErrorBanner message={emailError} />}
                <Button type="submit" disabled={emailLoading || emailCode.length < 6} size="lg" className="w-full">
                  {emailLoading ? t.profile.confirming : t.profile.confirmChange}
                </Button>
                <button
                  type="button"
                  onClick={() => { setEmailStep('form'); setEmailError(''); }}
                  className="w-full text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  ← {t.forgotPassword.differentEmail}
                </button>
              </form>
            )}
          </div>
        )}

        {/* 2FA tab */}
        {tab === '2fa' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 space-y-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${twoFAEnabled ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-slate-200 dark:bg-slate-800'}`}>
                  <ShieldCheck size={20} className={twoFAEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'} />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {twoFAEnabled ? t.profile.twoFactorEnabled : t.profile.twoFactorDisabled}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t.profile.twoFactorDesc}</p>
                </div>
              </div>
              {twoFASuccess && <SuccessBanner message={twoFASuccess} />}
              <Button
                type="button"
                onClick={handleToggle2FA}
                disabled={twoFALoading}
                size="lg"
                className={`w-full ${twoFAEnabled ? 'bg-slate-700 hover:bg-slate-600' : ''}`}
              >
                {twoFALoading ? '...' : twoFAEnabled ? t.profile.disable2FA : t.profile.enable2FA}
              </Button>
            </div>
          </div>
        )}

        {/* Delete tab */}
        {tab === 'delete' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-700 dark:text-red-300">{t.profile.deleteTitle}</p>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">{t.profile.deleteDesc}</p>
                </div>
              </div>
            </div>
            <form onSubmit={handleDelete} className="space-y-4">
              <Input
                id="deletePwd"
                label={t.profile.deletePassword}
                type="password"
                value={deletePwd}
                onChange={(e) => setDeletePwd(e.target.value)}
                placeholder="••••••••"
              />
              {deleteError && <ErrorBanner message={deleteError} />}
              <Button
                type="submit"
                disabled={deleteLoading || !deletePwd}
                size="lg"
                className="w-full bg-red-600 hover:bg-red-700 focus:ring-red-500"
              >
                {deleteLoading ? t.profile.deleting : t.profile.deleteAccount}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
