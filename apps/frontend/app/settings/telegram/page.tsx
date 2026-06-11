'use client';
import { useState } from 'react';
import { useAuthStore } from '../../../store/auth.store';
import api from '../../../lib/api';
import Link from 'next/link';

export default function TelegramSettingsPage() {
  const { user, setAuth, accessToken } = useAuthStore();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState(false);

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'CheckLabBot';

  const generateToken = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/telegram-link-token');
      setToken(res.data.data.token);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate token');
    } finally {
      setLoading(false);
    }
  };

  const unlink = async () => {
    if (!confirm('Disconnect your Telegram account?')) return;
    setUnlinking(true);
    setError(null);
    try {
      await api.post('/auth/telegram-unlink');
      if (user) {
        setAuth(
          { ...user, telegramId: null, telegramUsername: null },
          accessToken!,
          localStorage.getItem('refreshToken') || '',
        );
      }
      setToken(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to disconnect Telegram');
    } finally {
      setUnlinking(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="text-gray-500 dark:text-slate-400">
          Please <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline">sign in</Link> to manage settings.
        </div>
      </div>
    );
  }

  const isLinked = !!user.telegramId;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">← Back</Link>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-xl">
              ✈️
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">Telegram</h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">Connect your account to receive exam notifications</p>
            </div>
          </div>

          {isLinked ? (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium mb-1">
                  <span>✅</span>
                  <span>Account connected</span>
                </div>
                {user.telegramUsername && (
                  <p className="text-green-600 dark:text-green-400 text-sm">@{user.telegramUsername}</p>
                )}
              </div>

              <p className="text-sm text-gray-500 dark:text-slate-400">
                You'll receive notifications for exam reminders and results via Telegram.
              </p>

              <button
                onClick={unlink}
                disabled={unlinking}
                className="w-full border border-red-300 dark:border-red-900/60 text-red-600 dark:text-red-400 py-2.5 rounded-lg font-medium hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50 transition-colors"
              >
                {unlinking ? 'Disconnecting...' : 'Disconnect Telegram'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-slate-300 text-sm">
                Connect your Telegram account to get notified about upcoming exams and results directly in Telegram.
              </p>

              <ol className="text-sm text-gray-600 dark:text-slate-300 space-y-2 list-decimal list-inside">
                <li>Click the button below to generate a one-time token</li>
                <li>
                  Open{' '}
                  <a
                    href={`https://t.me/${botUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    @{botUsername}
                  </a>{' '}
                  on Telegram
                </li>
                <li>Send the command shown below to the bot</li>
              </ol>

              {!token ? (
                <button
                  onClick={generateToken}
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Generating...' : 'Generate link token'}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">Send this command to the bot:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 font-mono text-sm text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/50 rounded px-3 py-1.5">
                        /link {token}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(`/link ${token}`)}
                        className="text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 border border-gray-200 dark:border-slate-700 rounded px-2 py-1.5"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">Token expires in 15 minutes.</p>
                  </div>

                  <a
                    href={`https://t.me/${botUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-blue-500 text-white py-2.5 rounded-lg font-medium hover:bg-blue-600 transition-colors"
                  >
                    Open @{botUsername} in Telegram
                  </a>

                  <button
                    onClick={generateToken}
                    disabled={loading}
                    className="w-full text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 py-1"
                  >
                    Generate new token
                  </button>
                </div>
              )}

              {error && (
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm rounded-lg p-3">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
