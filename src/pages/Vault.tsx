import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { FolderLock, Plus, FileText, Image as ImageIcon, Download, Trash2, MapPin, X, Eye } from 'lucide-react';
import { applyOrgScope, orgIdForInsert } from '../utils/orgScope';

const UK_CITIES = [
  'General Info',
  'London',
  'Manchester',
  'Birmingham',
  'Glasgow',
  'Liverpool',
  'Edinburgh',
  'Bristol',
  'Leeds',
  'Sheffield',
  'Cardiff',
  'Belfast',
  'Newcastle',
  'Nottingham',
  'Leicester',
  'Bradford',
  'Southampton',
  'Cambridge',
  'Oxford',
  'Brighton',
];

interface VaultItem {
  id: string;
  title: string;
  description?: string;
  content_type: 'file' | 'text' | 'image';
  uk_city?: string;
  text_content?: string;
  file_path?: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  created_at: string;
}

export function Vault() {
  const { profile } = useAuth();
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    content_type: 'text' as 'text' | 'file' | 'image',
    uk_city: '',
    text_content: '',
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewingPdf, setViewingPdf] = useState<VaultItem | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    loadVaultItems();
  }, [profile, selectedCity]);

  const loadVaultItems = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      let query = supabase
        .from('vault_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedCity) {
        query = query.eq('uk_city', selectedCity);
      }

      query = applyOrgScope(query, profile);

      const { data, error } = await query;

      if (error) throw error;
      setVaultItems(data || []);
    } catch (error) {
      console.error('Error loading vault items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = async () => {
    if (!newItem.title.trim()) {
      alert('Please provide a title');
      return;
    }

    if (newItem.content_type !== 'text' && !uploadFile) {
      alert('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      let filePath = null;
      let fileName = null;
      let fileType = null;
      let fileSize = null;

      if (uploadFile && profile) {
        const fileExt = uploadFile.name.split('.').pop();
        const uniqueFileName = `${Date.now()}_${uploadFile.name}`;
        filePath = `${profile.id}/${uniqueFileName}`;

        console.log('Uploading file:', { filePath, fileName: uploadFile.name, size: uploadFile.size, type: uploadFile.type });

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('vault-files')
          .upload(filePath, uploadFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        console.log('Upload successful:', uploadData);

        fileName = uploadFile.name;
        fileType = uploadFile.type;
        fileSize = uploadFile.size;
      }

      const { error } = await supabase.from('vault_items').insert({
        user_id: profile?.id,
        organization_id: orgIdForInsert(profile),
        title: newItem.title,
        description: newItem.description,
        content_type: newItem.content_type,
        uk_city: newItem.uk_city || null,
        text_content: newItem.content_type === 'text' ? newItem.text_content : null,
        file_path: filePath,
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
      });

      if (error) throw error;

      setShowCreateModal(false);
      setNewItem({
        title: '',
        description: '',
        content_type: 'text',
        uk_city: '',
        text_content: '',
      });
      setUploadFile(null);
      loadVaultItems();
    } catch (error: any) {
      console.error('Error creating vault item:', error);
      alert('Failed to create vault item: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (item: VaultItem) => {
    if (!item.file_path) return;

    try {
      const { data, error } = await supabase.storage
        .from('vault-files')
        .download(item.file_path);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.file_name || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      alert('Failed to download file: ' + error.message);
    }
  };

  const handleViewPdf = async (item: VaultItem) => {
    if (!item.file_path) return;

    try {
      const { data } = supabase.storage
        .from('vault-files')
        .getPublicUrl(item.file_path);

      if (data?.publicUrl) {
        setPdfUrl(data.publicUrl);
        setViewingPdf(item);
      }
    } catch (error: any) {
      console.error('Error getting PDF URL:', error);
      alert('Failed to load PDF: ' + error.message);
    }
  };

  const handleDelete = async (id: string, filePath?: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      if (filePath) {
        await supabase.storage.from('vault-files').remove([filePath]);
      }

      const { error } = await supabase.from('vault_items').delete().eq('id', id);

      if (error) throw error;
      loadVaultItems();
    } catch (error) {
      console.error('Error deleting vault item:', error);
      alert('Failed to delete item');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vault</h1>
            <p className="text-gray-600 mt-1">Store and organize information about UK cities and processes</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="lt-btn-primary"
            style={{padding:'9px 16px',borderRadius:8}}
          >
            <Plus className="w-5 h-5" />
            Add Item
          </button>
        </div>

        <div className="lt-card p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by City</label>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Cities</option>
            {UK_CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="lt-spinner" />
            <p className="mt-4 text-gray-600">Loading vault items...</p>
          </div>
        ) : vaultItems.length === 0 ? (
          <div className="lt-card p-12 text-center">
            <FolderLock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {selectedCity ? `No items for ${selectedCity}` : 'No vault items yet'}
            </h3>
            <p className="text-gray-600 mb-4">Start by adding information about UK cities or processes</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="lt-btn-primary"
              style={{padding:'9px 16px',borderRadius:8}}
            >
              <Plus className="w-5 h-5" />
              Add First Item
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vaultItems.map((item) => (
              <div key={item.id} className="lt-card p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {item.content_type === 'text' ? (
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                    ) : item.content_type === 'image' ? (
                      <div className="bg-green-100 p-3 rounded-lg">
                        <ImageIcon className="w-6 h-6 text-green-600" />
                      </div>
                    ) : (
                      <div className="bg-purple-100 p-3 rounded-lg">
                        <FileText className="w-6 h-6 text-purple-600" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(item.id, item.file_path)}
                    className="text-red-600 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>

                {item.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.description}</p>
                )}

                {item.uk_city && (
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700 font-medium">{item.uk_city}</span>
                  </div>
                )}

                {item.content_type === 'text' && item.text_content && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <p className="text-sm text-gray-700 line-clamp-3">{item.text_content}</p>
                  </div>
                )}

                {item.file_name && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.file_name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(item.file_size)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.file_type === 'application/pdf' && (
                        <button
                          onClick={() => handleViewPdf(item)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="View PDF"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(item)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-400 mt-3">
                  {new Date(item.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-semibold">Add Vault Item</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                  <input
                    type="text"
                    value={newItem.title}
                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Item title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Additional details..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">UK City (Optional)</label>
                  <select
                    value={newItem.uk_city}
                    onChange={(e) => setNewItem({ ...newItem, uk_city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a city or leave blank for general info</option>
                    {UK_CITIES.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="text"
                        checked={newItem.content_type === 'text'}
                        onChange={(e) => setNewItem({ ...newItem, content_type: e.target.value as any })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">Text</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="image"
                        checked={newItem.content_type === 'image'}
                        onChange={(e) => setNewItem({ ...newItem, content_type: e.target.value as any })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">Image</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="file"
                        checked={newItem.content_type === 'file'}
                        onChange={(e) => setNewItem({ ...newItem, content_type: e.target.value as any })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">File</span>
                    </label>
                  </div>
                </div>

                {newItem.content_type === 'text' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Text Content</label>
                    <textarea
                      value={newItem.text_content}
                      onChange={(e) => setNewItem({ ...newItem, text_content: e.target.value })}
                      rows={6}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your text content..."
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload {newItem.content_type === 'image' ? 'Image' : 'File'}
                    </label>
                    <input
                      type="file"
                      accept={newItem.content_type === 'image' ? 'image/*' : '*'}
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateItem}
                  disabled={uploading}
                  className="lt-btn-primary flex-1"
                  style={{padding:'9px 16px',borderRadius:8}}
                >
                  {uploading ? 'Creating...' : 'Create Item'}
                </button>
              </div>
            </div>
          </div>
        )}

        {viewingPdf && pdfUrl && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{viewingPdf.title}</h3>
                  <p className="text-sm text-gray-600">{viewingPdf.file_name}</p>
                </div>
                <button
                  onClick={() => {
                    setViewingPdf(null);
                    setPdfUrl(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <iframe
                  src={pdfUrl}
                  className="w-full h-full"
                  title={viewingPdf.file_name || 'PDF Viewer'}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
