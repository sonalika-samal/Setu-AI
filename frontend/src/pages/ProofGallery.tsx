import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, 
  Download, 
  Images, 
  Search, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  User,
  ExternalLink,
  Loader2,
  SlidersHorizontal
} from 'lucide-react';
import { toast } from 'react-toastify';

interface Proof {
  _id: string;
  taskId: string;
  worker_name: string;
  worker_phone: string;
  media_url: string;
  media_type: string;
  file_name?: string;
  uploaded_by?: string;
  uploaded_at: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  review_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

export const ProofGallery: React.FC = () => {
  const { apiFetch } = useAuth();
  const queryClient = useQueryClient();

  // Filter States
  const [filterWorker, setFilterWorker] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Fetch all proofs globally
  const { data: proofs = [], isLoading, refetch } = useQuery<Proof[]>({
    queryKey: ['global-proofs-list'],
    queryFn: () => apiFetch('/tasks/proofs/all'),
    refetchInterval: 15000
  });

  // Audit Mutation
  const auditMutation = useMutation({
    mutationFn: (data: { proofId: string; status: 'Approved' | 'Rejected'; remarks: string }) => 
      apiFetch(`/proofs/${data.proofId}/audit`, {
        method: 'PUT',
        body: JSON.stringify({ status: data.status, remarks: data.remarks })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-proofs-list'] });
      toast.success('Proof successfully audited.');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to audit proof.')
  });

  // Filter Logic
  const filteredProofs = proofs.filter(p => {
    const workerName = p.worker_name || p.uploaded_by || '';
    const matchWorker = workerName.toLowerCase().includes(filterWorker.toLowerCase());
    
    // Simple date string matching (e.g. YYYY-MM-DD)
    const matchDate = filterDate 
      ? new Date(p.uploaded_at).toISOString().split('T')[0] === filterDate
      : true;

    const matchStatus = filterStatus ? p.status === filterStatus : true;

    return matchWorker && matchDate && matchStatus;
  });

  // Download utility
  const handleDownload = (url: string, filename: string) => {
    toast.info(`Initiating download for ${filename || 'proof file'}...`);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    if (filteredProofs.length === 0) {
      toast.warning('No proofs available to download.');
      return;
    }
    toast.info(`Downloading all ${filteredProofs.length} filtered proof files...`);
    filteredProofs.forEach((p, idx) => {
      setTimeout(() => {
        const name = p.file_name || `proof_${p.taskId}_${idx + 1}`;
        handleDownload(p.media_url, name);
      }, idx * 600); // Stagger requests to prevent browser from blocking
    });
  };

  const handleAudit = (proofId: string, status: 'Approved' | 'Rejected') => {
    const remarks = window.prompt(`Enter ${status.toLowerCase()} remarks (optional):`) || '';
    auditMutation.mutate({ proofId, status, remarks });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-violet-500/10 to-indigo-500/5 p-6 rounded-2xl border border-violet-500/10 backdrop-blur-sm shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600">
              <Images className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Proof of Work Gallery</h1>
          </div>
          <p className="text-slate-500 text-xs mt-1.5 font-medium">Verify completion files, documents, images, and videos uploaded by workforce agents.</p>
        </div>
        
        <button
          onClick={handleDownloadAll}
          disabled={filteredProofs.length === 0}
          className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-95 transition-all"
        >
          <Download className="w-4 h-4" />
          Download All Filtered
        </button>
      </div>

      {/* Filter panel */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Worker Search */}
          <div className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by worker name..."
              value={filterWorker}
              onChange={(e) => setFilterWorker(e.target.value)}
              className="bg-transparent outline-none flex-1 text-slate-700 font-medium"
            />
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-transparent outline-none text-slate-600 font-bold"
            />
          </div>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending Audit</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-bold bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
          Showing {filteredProofs.length} files
        </div>
      </div>

      {/* Proof Cards Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : filteredProofs.length === 0 ? (
        <div className="text-center p-12 text-slate-400 italic text-xs border border-dashed border-slate-200 rounded-2xl bg-white">
          No matching proof files found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProofs.map((proof) => {
            const isImage = proof.media_type?.startsWith('image/');
            const isVideo = proof.media_type?.startsWith('video/');
            const isPDF = proof.media_type?.toLowerCase().includes('pdf') || proof.file_name?.toLowerCase().endsWith('.pdf');
            
            const isPending = proof.status === 'Pending';
            const isApproved = proof.status === 'Approved';
            const isRejected = proof.status === 'Rejected';

            return (
              <div key={proof._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                
                {/* Media Container */}
                <div className="h-52 bg-slate-900 flex items-center justify-center relative group select-none">
                  {isImage ? (
                    <img
                      src={proof.media_url}
                      alt="Proof"
                      className="w-full h-full object-contain"
                    />
                  ) : isVideo ? (
                    <video
                      src={proof.media_url}
                      controls
                      className="w-full h-full object-contain"
                    />
                  ) : isPDF ? (
                    <div className="text-center text-white/80 p-4 space-y-3">
                      <FileText className="w-16 h-16 mx-auto text-rose-400" />
                      <div className="text-xs font-bold truncate max-w-[200px]">{proof.file_name || 'Document.pdf'}</div>
                      <a
                        href={proof.media_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-extrabold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider"
                      >
                        Preview PDF <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ) : (
                    <div className="text-center text-white/80 p-4 space-y-3">
                      <FileText className="w-16 h-16 mx-auto text-slate-400" />
                      <div className="text-xs font-bold truncate max-w-[200px]">{proof.file_name || 'Attachment'}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{proof.media_type || 'Unknown'}</span>
                    </div>
                  )}

                  {/* Status Overlay Badge */}
                  <div className="absolute top-3.5 right-3.5">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase border tracking-wider shadow ${
                      isApproved 
                        ? 'bg-emerald-500 border-emerald-600 text-white' 
                        : isRejected 
                        ? 'bg-rose-500 border-rose-600 text-white' 
                        : 'bg-amber-500 border-amber-600 text-white animate-pulse'
                    }`}>
                      {proof.status}
                    </span>
                  </div>
                </div>

                {/* Details Area */}
                <div className="p-4 bg-slate-50/50 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2.5 text-xs text-slate-600 font-medium">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold border-b border-slate-100 pb-1.5">
                      <span>Task: {proof.taskId}</span>
                      <span>Uploaded: {new Date(proof.uploaded_at).toLocaleDateString('en-IN')}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-800">{proof.worker_name || 'Unknown Worker'}</div>
                        <div className="text-[10px] text-slate-400">{proof.worker_phone}</div>
                      </div>
                    </div>

                    {proof.reviewed_by && (
                      <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 bg-white p-2 rounded-lg border border-slate-100">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Audited by {proof.reviewed_by} on {proof.reviewed_at ? new Date(proof.reviewed_at).toLocaleDateString() : ''}
                      </div>
                    )}

                    {proof.review_notes && (
                      <div className="p-2.5 rounded-lg border border-slate-200 bg-white leading-relaxed text-[11px]">
                        <strong className="block text-slate-700 text-[10px] uppercase font-bold">Review Notes</strong>
                        {proof.review_notes}
                      </div>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleDownload(proof.media_url, proof.file_name || `proof_${proof.taskId}`)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs transition-colors shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>

                    {isPending && (
                      <>
                        <button
                          onClick={() => handleAudit(proof._id, 'Rejected')}
                          className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold rounded-lg text-xs transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleAudit(proof._id, 'Approved')}
                          className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors shadow shadow-emerald-600/10"
                        >
                          Approve
                        </button>
                      </>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProofGallery;
