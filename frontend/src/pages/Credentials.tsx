import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { 
  KeyRound, 
  Database, 
  Save, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Settings,
  Mail,
  User
} from 'lucide-react';

interface DbStatus {
  dbName: string;
  dbStatus: string;
  connectionStatus: string;
}

interface CredentialsData {
  meta: {
    accessToken: string;
    phoneNumberId: string;
    businessId: string;
    wabaId: string;
    appId: string;
    appSecret: string;
  };
  sarvam: {
    apiKey: string;
    speechModel: string;
    taskExtractionModel: string;
    classificationModel: string;
  };
  settings: {
    businessName: string;
    timezone: string;
    reminderOffset: number;
    language: string;
    taskAssignmentTemplate: string;
  };
  google: {
    clientId: string;
  };
}

const AdminAccountCard: React.FC<{ user: any; onSave: () => void; apiFetch: any }> = ({ user: account, onSave, apiFetch }) => {
  const [username, setUsername] = useState(account.username);
  const [password, setPassword] = useState(
    account.username === 'owner' ? 'OwnerSecure2026#SetuAI_!$' :
    account.username === 'admin' ? 'AdminSecure2026#SetuAI_!$' : ''
  );
  const [googleEmail, setGoogleEmail] = useState(account.googleEmail || '');
  const [showPass, setShowPass] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setMsg('');
    try {
      const payload: any = {
        username,
        googleEmail: googleEmail.trim().toLowerCase(),
        name: account.name,
        phone: account.phone,
        role: account.role
      };
      if (password) {
        payload.password = password;
      }
      await apiFetch(`/auth/admins-owners/${account._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setPassword('');
      setIsError(false);
      setMsg('Account credentials updated successfully!');
      onSave();
      setTimeout(() => setMsg(''), 4000);
    } catch (err: any) {
      setIsError(true);
      setMsg(err.message || 'Failed to update credentials.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-black/5 dark:bg-black/25 border border-slate-200 dark:border-white/5 space-y-4">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
          {account.role === 'Owner' ? 'Organisation Head (Owner)' : 'Organisation Administrator (Admin)'}
        </span>
        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium italic">{account.name}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Username ID */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Username / Login ID</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <User className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs text-slate-850 dark:text-white rounded-lg glass-input"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
            Password <span className="text-[9px] font-normal text-slate-450 lowercase italic">(leave blank to keep)</span>
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-450">
              <Lock className="w-3.5 h-3.5" />
            </span>
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-8 py-2 text-xs text-slate-850 dark:text-white rounded-lg glass-input"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-500 hover:text-slate-350"
            >
              {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Google Email */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Gmail (for Google Login)</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-450">
              <Mail className="w-3.5 h-3.5" />
            </span>
            <input
              type="email"
              value={googleEmail}
              onChange={(e) => setGoogleEmail(e.target.value)}
              placeholder="e.g. user@gmail.com"
              className="w-full pl-9 pr-3 py-2 text-xs text-slate-855 dark:text-white rounded-lg glass-input"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div>
          {msg && (
            <p className={`text-[11px] font-bold ${isError ? 'text-rose-500' : 'text-emerald-500'}`}>
              {msg}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleUpdate}
          disabled={isUpdating}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary to-primary-hover hover:shadow-glow text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50"
        >
          {isUpdating ? (
            <span className="w-3.5 h-3.5 border border-white/20 border-t-white rounded-full animate-spin"></span>
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          Save account settings
        </button>
      </div>
    </div>
  );
};

export const Credentials: React.FC = () => {
  const { apiFetch, user } = useAuth();
  const queryClient = useQueryClient();

  const [showMetaToken, setShowMetaToken] = useState(false);
  const [showMetaSecret, setShowMetaSecret] = useState(false);
  const [showSarvamKey, setShowSarvamKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Access control check before rendering logic/queries
  const isOwner = user?.role === 'Owner';

  // 1. Fetch DB connection status
  const { data: dbStatus, isLoading: isDbLoading, error: dbError } = useQuery<DbStatus>({
    queryKey: ['db-status'],
    queryFn: () => apiFetch('/credentials/db-status'),
    refetchInterval: 10000, // Check DB health state every 10s
    enabled: isOwner,
  });

  // 2. Fetch current credential document configs
  const { data: credentials, isLoading: isCredsLoading, error: credsError } = useQuery<CredentialsData>({
    queryKey: ['app-credentials'],
    queryFn: () => apiFetch('/credentials'),
    enabled: isOwner,
  });

  const [formData, setFormData] = useState<CredentialsData | null>(null);

  // 3. Fetch administrative users (Owner and Admin)
  const { data: adminsOwners, refetch: refetchAdmins } = useQuery<any[]>({
    queryKey: ['admins-owners-creds'],
    queryFn: () => apiFetch('/auth/admins-owners'),
    enabled: isOwner,
  });

  // Sync state on fetch complete
  React.useEffect(() => {
    if (credentials) {
      setFormData({
        ...credentials,
        google: credentials.google || { clientId: '' }
      });
    }
  }, [credentials]);

  const updateMutation = useMutation({
    mutationFn: (data: CredentialsData) => apiFetch('/credentials', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      setSaveSuccess(true);
      setSaveError('');
      queryClient.invalidateQueries({ queryKey: ['app-credentials'] });
      setTimeout(() => setSaveSuccess(false), 4000);
    },
    onError: (err) => {
      setSaveError((err as Error).message || 'Failed to update credentials settings.');
    }
  });

  const handleInputChange = (section: keyof CredentialsData, field: string, value: any) => {
    if (!formData) return;
    setFormData({
      ...formData,
      [section]: {
        ...formData[section],
        [field]: value
      }
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      updateMutation.mutate(formData);
    }
  };

  if (!isOwner) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shadow-glow-rose">
          <Lock className="w-8 h-8 text-rose-400 animate-pulse" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-100 tracking-wide">Access Restricted</h2>
          <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
            Only the system **Organisation Head** has permission to view, edit, or commit application credentials.
          </p>
        </div>
      </div>
    );
  }

  if (credsError || dbError) {
    const errorMsg = (credsError as Error)?.message || (dbError as Error)?.message || 'Failed to fetch credentials';
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-wide flex items-center gap-3">
            <KeyRound className="w-8 h-8 text-primary" />
            Credentials Manager
          </h2>
        </div>
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-bold">Error loading configurations</p>
            <p className="text-xs mt-1 text-rose-400/90">{errorMsg}</p>
          </div>
        </div>
      </div>
    );
  }

  const isLoading = isDbLoading || isCredsLoading || !formData;

  if (isLoading) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }


  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-wide flex items-center gap-3">
          <KeyRound className="w-8 h-8 text-primary" />
          Credentials Manager
        </h2>
        <p className="text-slate-400 text-sm mt-1">Configure and manage secure API keys, application properties, and environment metadata</p>
      </div>

      {/* Database Connection Status Block */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-gradient-to-r from-blue-950/10 to-indigo-950/10 space-y-4">
        <div className="flex items-center gap-3 border-b border-white/5 pb-3">
          <Database className="w-5 h-5 text-secondary" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200">Database Connection Telemetry</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-xl bg-black/5 dark:bg-black/20 border border-slate-200 dark:border-white/5 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Database Name</span>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-2 truncate font-mono">{dbStatus?.dbName || 'n8ndb'}</p>
          </div>
          <div className="p-4 rounded-xl bg-black/5 dark:bg-black/20 border border-slate-200 dark:border-white/5 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Database Status</span>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 pulse-active"></span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">{dbStatus?.dbStatus || 'Connected'}</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-black/5 dark:bg-black/20 border border-slate-200 dark:border-white/5 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Connection Status</span>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                {dbStatus?.connectionStatus || 'Healthy'}
              </span>
              <span className="text-[10px] text-slate-500 font-mono italic">Loaded from .env</span>
            </div>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p>Credentials saved and applied successfully. Environment reload completed.</p>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{saveError}</p>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Meta WhatsApp Control Section */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Meta WhatsApp Cloud API</h3>
              </div>
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold bg-white/5 px-2 py-0.5 rounded-md">Dynamic configuration</span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Phone Number ID</label>
                  <input
                    type="text"
                    value={formData.meta.phoneNumberId}
                    onChange={(e) => handleInputChange('meta', 'phoneNumberId', e.target.value)}
                    className="w-full px-3 py-2.5 text-xs text-slate-800 dark:text-white rounded-lg glass-input"
                    placeholder="e.g. 122019..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Business Account ID</label>
                  <input
                    type="text"
                    value={formData.meta.businessId}
                    onChange={(e) => handleInputChange('meta', 'businessId', e.target.value)}
                    className="w-full px-3 py-2.5 text-xs text-slate-800 dark:text-white rounded-lg glass-input"
                    placeholder="e.g. 129618..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">WABA (WhatsApp Business) ID</label>
                  <input
                    type="text"
                    value={formData.meta.wabaId}
                    onChange={(e) => handleInputChange('meta', 'wabaId', e.target.value)}
                    className="w-full px-3 py-2.5 text-xs text-slate-800 dark:text-white rounded-lg glass-input"
                    placeholder="e.g. 172688..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">App ID</label>
                  <input
                    type="text"
                    value={formData.meta.appId}
                    onChange={(e) => handleInputChange('meta', 'appId', e.target.value)}
                    className="w-full px-3 py-2.5 text-xs text-slate-800 dark:text-white rounded-lg glass-input"
                    placeholder="e.g. 132180..."
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Access Token (Encrypted)</label>
                <div className="relative">
                  <input
                    type={showMetaToken ? 'text' : 'password'}
                    value={formData.meta.accessToken}
                    onChange={(e) => handleInputChange('meta', 'accessToken', e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 text-xs text-slate-800 dark:text-white rounded-lg glass-input"
                    placeholder="Meta Graph API temporary or permanent page token"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMetaToken(!showMetaToken)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showMetaToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">App Secret (Encrypted)</label>
                <div className="relative">
                  <input
                    type={showMetaSecret ? 'text' : 'password'}
                    value={formData.meta.appSecret}
                    onChange={(e) => handleInputChange('meta', 'appSecret', e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 text-xs text-slate-800 dark:text-white rounded-lg glass-input"
                    placeholder="App dashboard developer secret key"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMetaSecret(!showMetaSecret)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showMetaSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sarvam AI & Abstract Provider Settings */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Sarvam AI Engines & Keys</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Sarvam API Key (Encrypted)</label>
                  <div className="relative">
                    <input
                      type={showSarvamKey ? 'text' : 'password'}
                      value={formData.sarvam.apiKey}
                      onChange={(e) => handleInputChange('sarvam', 'apiKey', e.target.value)}
                      className="w-full pl-3 pr-10 py-2.5 text-xs text-slate-800 dark:text-white rounded-lg glass-input"
                      placeholder="Enter Sarvam AI developer portal credentials"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSarvamKey(!showSarvamKey)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                    >
                      {showSarvamKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-medium">Speech Model</label>
                    <input
                      type="text"
                      value={formData.sarvam.speechModel}
                      onChange={(e) => handleInputChange('sarvam', 'speechModel', e.target.value)}
                      className="w-full px-3 py-2.5 text-xs text-slate-800 dark:text-white rounded-lg glass-input"
                      placeholder="e.g. saaras:v3"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-medium">Classification Model</label>
                    <input
                      type="text"
                      value={formData.sarvam.classificationModel}
                      onChange={(e) => handleInputChange('sarvam', 'classificationModel', e.target.value)}
                      className="w-full px-3 py-2.5 text-xs text-slate-800 dark:text-white rounded-lg glass-input"
                      placeholder="e.g. sarvam-30b"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Task Extraction Model</label>
                  <input
                    type="text"
                    value={formData.sarvam.taskExtractionModel}
                    onChange={(e) => handleInputChange('sarvam', 'taskExtractionModel', e.target.value)}
                    className="w-full px-3 py-2.5 text-xs text-slate-800 dark:text-white rounded-lg glass-input"
                    placeholder="e.g. sarvam-105b"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 text-[11px] text-slate-500 leading-relaxed italic">
              AI provider abstraction routes calls dynamically depending on active selections. Standard keys are protected locally.
            </div>
          </div>

          {/* Google OAuth Configuration Section */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                <Settings className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Google OAuth Settings</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Google OAuth Client ID</label>
                  <input
                    type="text"
                    value={formData.google?.clientId || ''}
                    onChange={(e) => handleInputChange('google', 'clientId', e.target.value)}
                    className="w-full px-3 py-2.5 text-xs text-slate-850 dark:text-white rounded-lg glass-input"
                    placeholder="e.g. 123456-xxxx.apps.googleusercontent.com"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 text-[11px] text-slate-500 leading-relaxed italic">
              Exposes Gmail Sign-in on the login page. Obtain the Client ID from Google Cloud Console.
            </div>
          </div>
        </div>



        {/* Submit */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-hover hover:shadow-glow text-white font-bold py-3 px-6 rounded-xl text-sm transition-all duration-200 disabled:opacity-50"
          >
            {updateMutation.isPending ? (
              <>
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                Applying Configurations...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Commit Configurations
              </>
            )}
          </button>
        </div>
      </form>

      {/* Administrative logins and OAuth section */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6 mt-8">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-primary" />
            <h3 className="font-extrabold text-slate-800 dark:text-slate-200">Administrative Credentials & Gmail Logins</h3>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
            Owner Only Access
          </span>
        </div>

        {!adminsOwners ? (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {adminsOwners.filter(acc => ['Owner', 'Admin'].includes(acc.role)).map(acc => (
              <AdminAccountCard 
                key={acc._id} 
                user={acc} 
                onSave={refetchAdmins} 
                apiFetch={apiFetch} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default Credentials;
