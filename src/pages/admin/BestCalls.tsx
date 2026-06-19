import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Layout } from '../../components/Layout';
import { Upload, Trash2, Play, Pause, ThumbsUp, MessageCircle, Search, Filter, Plus, X } from 'lucide-react';

interface BestCall {
  id: string;
  title: string;
  description: string;
  category: string;
  file_name: string;
  file_path: string;
  file_size: number;
  duration: number | null;
  uploaded_by: string;
  created_at: string;
  uploader?: {
    full_name: string;
    email: string;
  };
  likes_count?: number;
  comments_count?: number;
}

const CATEGORIES = [
  { value: 'objection_handling', label: 'Objection Handling' },
  { value: 'urgency', label: 'Urgency' },
  { value: 'rapport_building', label: 'Rapport Building' },
  { value: 'closing', label: 'Closing' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'follow_up', label: 'Follow Up' },
];

export function BestCalls() {
  const { profile } = useAuth();
  const [calls, setCalls] = useState<BestCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [playingCall, setPlayingCall] = useState<string | null>(null);

  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: 'objection_handling',
    file: null as File | null,
    duration: '',
  });

  useEffect(() => {
    loadCalls();
  }, []);

  const loadCalls = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('best_calls')
        .select(`
          *,
          uploader:user_profiles!best_calls_uploaded_by_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const callsWithStats = await Promise.all(
        (data || []).map(async (call) => {
          const [likesResult, commentsResult] = await Promise.all([
            supabase.from('best_call_likes').select('id', { count: 'exact', head: true }).eq('call_id', call.id),
            supabase.from('best_call_comments').select('id', { count: 'exact', head: true }).eq('call_id', call.id),
          ]);

          return {
            ...call,
            likes_count: likesResult.count || 0,
            comments_count: commentsResult.count || 0,
          };
        })
      );

      setCalls(callsWithStats);
    } catch (error) {
      console.error('Error loading best calls:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadForm.file || !uploadForm.title.trim()) {
      alert('Please provide a title and select a file');
      return;
    }

    const maxSizeBytes = 500 * 1024 * 1024; // 500 MB for audio files
    if (uploadForm.file.size > maxSizeBytes) {
      alert('File size exceeds the 500 MB limit. Please choose a smaller file.');
      return;
    }

    const fileType = uploadForm.file.name.split('.').pop()?.toLowerCase();
    const allowedTypes = ['mp3', 'wav', 'm4a', 'ogg', 'webm', 'aac', 'flac'];
    if (!allowedTypes.includes(fileType || '')) {
      alert('Supported audio formats: MP3, WAV, M4A, OGG, WEBM, AAC, FLAC');
      return;
    }

    try {
      setUploading(true);

      const timestamp = Date.now();
      const sanitizedFileName = uploadForm.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${timestamp}_${sanitizedFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('call-recordings')
        .upload(filePath, uploadForm.file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('best_calls')
        .insert({
          title: uploadForm.title,
          description: uploadForm.description,
          category: uploadForm.category,
          file_name: uploadForm.file.name,
          file_path: filePath,
          file_size: uploadForm.file.size,
          duration: uploadForm.duration ? parseInt(uploadForm.duration) : null,
          uploaded_by: profile?.id,
        });

      if (dbError) throw dbError;

      alert('Call recording uploaded successfully!');
      setShowUploadModal(false);
      setUploadForm({
        title: '',
        description: '',
        category: 'objection_handling',
        file: null,
        duration: '',
      });
      loadCalls();
    } catch (error: any) {
      console.error('Error uploading call:', error);
      alert('Failed to upload call recording: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteCall = async (call: BestCall) => {
    if (!confirm(`Are you sure you want to delete "${call.title}"?`)) return;

    try {
      await supabase.storage.from('call-recordings').remove([call.file_path]);
      await supabase.from('best_calls').delete().eq('id', call.id);
      alert('Call recording deleted successfully');
      loadCalls();
    } catch (error: any) {
      console.error('Error deleting call:', error);
      alert('Failed to delete call recording: ' + error.message);
    }
  };

  const getAudioUrl = (filePath: string) => {
    const { data } = supabase.storage.from('call-recordings').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.label || category;
  };

  const filteredCalls = calls.filter(call => {
    const matchesSearch = call.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         call.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || call.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const callsByCategory = CATEGORIES.map(cat => ({
    ...cat,
    calls: filteredCalls.filter(call => call.category === cat.value),
  }));

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Best Calls</h1>
            <p className="text-gray-600">Manage call recordings organized by category</p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="lt-btn-primary"
            style={{padding:'9px 16px',borderRadius:8}}
          >
            <Plus className="w-5 h-5" />
            <span>Upload Call</span>
          </button>
        </div>

        <div className="mb-6 flex space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search calls..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="text-gray-400 w-5 h-5" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="lt-spinner" />
          </div>
        ) : (
          <div className="space-y-8">
            {callsByCategory.map(category => (
              category.calls.length > 0 && (
                <div key={category.value} className="lt-card overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">{category.label}</h2>
                    <p className="text-sm text-gray-600 mt-1">{category.calls.length} recording{category.calls.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {category.calls.map(call => (
                      <div key={call.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{call.title}</h3>
                              <span className="lt-badge lt-badge-blue text-xs font-medium rounded-full">
                                {formatDuration(call.duration)}
                              </span>
                            </div>
                            <p className="text-gray-600 mb-3">{call.description}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>{call.file_name}</span>
                              <span>{formatFileSize(call.file_size)}</span>
                              <span>Uploaded by {call.uploader?.full_name}</span>
                              <span>{new Date(call.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center space-x-4 mt-3 text-sm text-gray-600">
                              <div className="flex items-center space-x-1">
                                <ThumbsUp className="w-4 h-4" />
                                <span>{call.likes_count}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <MessageCircle className="w-4 h-4" />
                                <span>{call.comments_count}</span>
                              </div>
                            </div>
                            <div className="mt-4">
                              <audio
                                controls
                                className="w-full max-w-2xl"
                                src={getAudioUrl(call.file_path)}
                                onPlay={() => setPlayingCall(call.id)}
                                onPause={() => setPlayingCall(null)}
                              />
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteCall(call)}
                            className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete call"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
            {filteredCalls.length === 0 && (
              <div className="text-center py-12 lt-card">
                <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No call recordings found</p>
                <p className="text-sm text-gray-400">Upload your first call recording to get started</p>
              </div>
            )}
          </div>
        )}

        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Upload Call Recording</h2>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleFileUpload} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Call Title *
                  </label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Excellent Objection Handling Example"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Describe what makes this call a great example..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (seconds)
                  </label>
                  <input
                    type="number"
                    value={uploadForm.duration}
                    onChange={(e) => setUploadForm({ ...uploadForm, duration: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 180"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Audio File *
                  </label>
                  <input
                    type="file"
                    accept=".mp3,.wav,.m4a,.ogg,.webm,.aac,.flac"
                    onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                    className="hidden"
                    id="call-upload"
                    required
                  />
                  <label
                    htmlFor="call-upload"
                    className="flex items-center justify-center px-6 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
                  >
                    <div className="text-center">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <span className="text-sm text-gray-600">
                        Click to upload audio file
                      </span>
                    </div>
                  </label>
                  {uploadForm.file && (
                    <p className="mt-2 text-sm text-gray-600">
                      Selected: {uploadForm.file.name} ({formatFileSize(uploadForm.file.size)})
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-2">
                    Supported formats: MP3, WAV, M4A, OGG, WEBM, AAC, FLAC (max 500MB)
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? 'Uploading...' : 'Upload Call'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
