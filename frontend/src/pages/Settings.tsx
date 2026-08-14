import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { 
  Settings as SettingsIcon, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Globe, 
  FileText, 
  Loader2 
} from 'lucide-react';

interface SettingsData {
  businessName: string;
  timezone: string;
  reminderOffset: number;
  reminderOffset1: number;
  reminderOffset2: number;
  reminderOffset3: number;
  language: string;
  taskAssignmentTemplate: string;
}

export const Settings: React.FC = () => {
  const { apiFetch } = useAuth();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<SettingsData>({
    businessName: '',
    timezone: 'Asia/Kolkata',
    reminderOffset: 30,
    reminderOffset1: 180,
    reminderOffset2: 90,
    reminderOffset3: 30,
    language: 'en',
    taskAssignmentTemplate: '',
  });

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 1. Fetch current settings
  const { data: currentSettings, isLoading } = useQuery<SettingsData>({
    queryKey: ['settings-data'],
    queryFn: () => apiFetch('/settings'),
  });

  // Load fetched settings into state
  useEffect(() => {
    if (currentSettings) {
      setFormData(currentSettings);
    }
  }, [currentSettings]);

  // 2. Mutation for saving settings
  const updateMutation = useMutation({
    mutationFn: (updatedData: SettingsData) => 
      apiFetch('/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-data'] });
      setSaveSuccess(true);
      setSaveError(null);
      setTimeout(() => setSaveSuccess(false), 5000);
    },
    onError: (err: any) => {
      setSaveError(err.message || 'Failed to save settings.');
      setSaveSuccess(false);
    }
  });

  const handleInputChange = (field: keyof SettingsData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center text-slate-500 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider">Syncing Application Configs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div>
        <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-wide">Application settings</h2>
        <p className="text-slate-400 text-sm mt-1">Configure company profiles, localization parameters, and smart reminder rules</p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p>Operational settings updated and applied successfully.</p>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{saveError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Row of properties and reminders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* General Business Info Card */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                <Globe className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Localization & Identity</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Business Name</label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                    className="w-full px-3 py-2.5 text-xs text-slate-800 dark:text-white rounded-lg glass-input"
                    placeholder="e.g. Setu AI"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-medium">Timezone</label>
                    <input
                      type="text"
                      value={formData.timezone}
                      onChange={(e) => handleInputChange('timezone', e.target.value)}
                      className="w-full px-3 py-2.5 text-xs text-slate-800 dark:text-white rounded-lg glass-input"
                      placeholder="Asia/Kolkata"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-medium">Default Language Code</label>
                    <input
                      type="text"
                      value={formData.language}
                      onChange={(e) => handleInputChange('language', e.target.value)}
                      className="w-full px-3 py-2.5 text-xs text-slate-800 dark:text-white rounded-lg glass-input"
                      placeholder="en"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 text-[11px] text-slate-500 leading-relaxed italic">
              These properties synchronize across metadata rendering contexts and localize natural dates parsing logic.
            </div>
          </div>

          {/* Smart Reminder Rules Card */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
              <Clock className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200">Deadline Reminder Rules</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Reminder 1 Offset (Minutes before deadline)</label>
                <input
                  type="number"
                  value={formData.reminderOffset1}
                  onChange={(e) => handleInputChange('reminderOffset1', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 text-xs text-slate-800 dark:text-white rounded-lg glass-input"
                  placeholder="180 (3 hours)"
                  min="0"
                  required
                />
                <span className="text-[10px] text-slate-500 block">Default is 180 minutes (3 hours before task deadline).</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Reminder 2 Offset (Minutes before deadline)</label>
                <input
                  type="number"
                  value={formData.reminderOffset2}
                  onChange={(e) => handleInputChange('reminderOffset2', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 text-xs text-slate-800 dark:text-white rounded-lg glass-input"
                  placeholder="90 (1.5 hours)"
                  min="0"
                  required
                />
                <span className="text-[10px] text-slate-500 block">Default is 90 minutes (1 hour 30 mins before task deadline).</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Reminder 3 Offset (Minutes before deadline)</label>
                <input
                  type="number"
                  value={formData.reminderOffset3}
                  onChange={(e) => handleInputChange('reminderOffset3', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 text-xs text-slate-800 dark:text-white rounded-lg glass-input"
                  placeholder="30 (30 mins)"
                  min="0"
                  required
                />
                <span className="text-[10px] text-slate-500 block">Default is 30 minutes (30 mins before task deadline).</span>
              </div>
            </div>
          </div>
        </div>

        {/* Task Assignment Template Card */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-3">
            <FileText className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Staff Member Task Assignment Template</h3>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium block">Notification Message Template</label>
            <textarea
              value={formData.taskAssignmentTemplate}
              onChange={(e) => handleInputChange('taskAssignmentTemplate', e.target.value)}
              className="w-full px-3 py-2.5 text-xs text-slate-800 dark:text-white rounded-lg glass-input min-h-[140px] font-mono leading-normal"
              placeholder="Enter message layout..."
              required
            />
            <p className="text-[10px] text-slate-500">
              The assigned WhatsApp message always prepends the unique Task ID index on top. 
              Placeholders available: <code className="text-[#a78bfa] font-bold">{"{{task_id}}"}</code>, <code className="text-[#a78bfa] font-bold">{"{{worker_name}}"}</code>, <code className="text-[#a78bfa] font-bold">{"{{task_msg}}"}</code>, <code className="text-[#a78bfa] font-bold">{"{{location}}"}</code>, <code className="text-[#a78bfa] font-bold">{"{{deadline}}"}</code>, <code className="text-[#a78bfa] font-bold">{"{{company_name}}"}</code>
            </p>
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-hover hover:shadow-glow text-white font-bold py-3 px-6 rounded-xl text-sm transition-all duration-200 disabled:opacity-50"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
