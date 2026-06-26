import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { uploadLargeFile } from '../../utils/chunkedUpload';
import {
  BookCollection,
  BookDocument,
  coverHueFromTitle,
  extractPdfsFromZip,
  formatBookSize,
  humanizePdfName,
  sanitizeStorageName,
} from '../../utils/books';
import { BookCover } from '../../components/BookCover';
import {
  ArrowLeft, BookOpen, Upload, Trash2, ToggleLeft, ToggleRight, Loader2, FileArchive, AlertTriangle,
} from 'lucide-react';

export function OwnerBooks() {
  const { profile } = useAuth();
  const [collections, setCollections] = useState<BookCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Record<string, BookDocument[]>>({});

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('book_collections')
      .select('*')
      .order('created_at', { ascending: false });
    setCollections(data || []);
    setLoading(false);
  };

  const loadDocuments = async (collectionId: string) => {
    if (documents[collectionId]) return;
    const { data } = await supabase
      .from('book_documents')
      .select('*')
      .eq('collection_id', collectionId)
      .order('sort_order', { ascending: true });
    setDocuments((prev) => ({ ...prev, [collectionId]: data || [] }));
  };

  const toggleExpanded = async (collectionId: string) => {
    if (expandedId === collectionId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(collectionId);
    await loadDocuments(collectionId);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zipFile || !title.trim() || !profile) return;

    setUploading(true);
    setError('');
    setUploadProgress('Reading ZIP file...');

    try {
      const pdfs = await extractPdfsFromZip(zipFile);
      if (pdfs.length === 0) {
        throw new Error('No PDF files found in this ZIP. Add .pdf files and try again.');
      }

      const coverHue = coverHueFromTitle(title.trim());
      const { data: collection, error: collectionError } = await supabase
        .from('book_collections')
        .insert({
          title: title.trim(),
          description: description.trim(),
          cover_hue: coverHue,
          is_published: true,
          uploaded_by: profile.id,
          document_count: 0,
        })
        .select()
        .single();

      if (collectionError || !collection) throw collectionError || new Error('Failed to create collection');

      const collectionId = collection.id;
      const zipPath = `uploads/${collectionId}/source.zip`;
      setUploadProgress('Uploading ZIP archive...');

      const zipUpload = await uploadLargeFile({ bucket: 'book-files', path: zipPath, file: zipFile });
      if (!zipUpload.success) throw zipUpload.error || new Error('ZIP upload failed');

      await supabase.from('book_collections').update({ zip_file_path: zipPath }).eq('id', collectionId);

      const docRows: Omit<BookDocument, 'id' | 'created_at'>[] = [];

      for (let i = 0; i < pdfs.length; i += 1) {
        const pdf = pdfs[i];
        setUploadProgress(`Uploading ${i + 1} of ${pdfs.length}: ${pdf.name}`);
        const safeName = sanitizeStorageName(pdf.name);
        const filePath = `extracted/${collectionId}/${Date.now()}_${i}_${safeName}`;
        const file = new File([pdf.blob], pdf.name, { type: 'application/pdf' });

        const upload = await uploadLargeFile({ bucket: 'book-files', path: filePath, file });
        if (!upload.success) throw upload.error || new Error(`Failed to upload ${pdf.name}`);

        docRows.push({
          collection_id: collectionId,
          title: humanizePdfName(pdf.name),
          original_filename: pdf.name,
          file_path: filePath,
          file_size: pdf.blob.size,
          sort_order: i,
        });
      }

      const { error: docsError } = await supabase.from('book_documents').insert(docRows);
      if (docsError) throw docsError;

      await supabase
        .from('book_collections')
        .update({
          document_count: docRows.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', collectionId);

      setShowUpload(false);
      setTitle('');
      setDescription('');
      setZipFile(null);
      setUploadProgress('');
      await fetchCollections();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const togglePublished = async (collection: BookCollection) => {
    await supabase
      .from('book_collections')
      .update({ is_published: !collection.is_published, updated_at: new Date().toISOString() })
      .eq('id', collection.id);
    fetchCollections();
  };

  const deleteCollection = async (collection: BookCollection) => {
    if (!confirm(`Delete "${collection.title}" and all ${collection.document_count} books?`)) return;

    const docs = documents[collection.id] || (
      await supabase.from('book_documents').select('file_path').eq('collection_id', collection.id)
    ).data || [];

    const paths = [
      ...(collection.zip_file_path ? [collection.zip_file_path] : []),
      ...docs.map((d: { file_path: string }) => d.file_path),
    ];

    if (paths.length > 0) {
      await supabase.storage.from('book-files').remove(paths);
    }

    await supabase.from('book_collections').delete().eq('id', collection.id);
    setDocuments((prev) => {
      const next = { ...prev };
      delete next[collection.id];
      return next;
    });
    if (expandedId === collection.id) setExpandedId(null);
    fetchCollections();
  };

  return (
    <Layout>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <Link to="/owner" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#808080', textDecoration: 'none', marginBottom: 16 }}>
            <ArrowLeft size={13} /> Back to Owner Portal
          </Link>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#808080', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Owner Portal</p>
              <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#171717', marginBottom: 4 }}>Books Library</h1>
              <p style={{ fontSize: 14, color: '#666', maxWidth: 520 }}>
                Upload a ZIP of PDF ebooks. Each PDF becomes a readable book. Enable the Books feature per organisation in org settings.
              </p>
            </div>
            <button type="button" onClick={() => setShowUpload(true)} className="lt-btn-primary" style={{ padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Upload size={14} /> Upload ZIP
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div className="lt-spinner" />
          </div>
        ) : collections.length === 0 ? (
          <div className="lt-card" style={{ padding: 48, textAlign: 'center' }}>
            <BookOpen size={32} color="#ccc" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>No book collections yet</p>
            <button type="button" onClick={() => setShowUpload(true)} className="lt-btn-primary" style={{ padding: '9px 16px' }}>
              Upload your first ZIP
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {collections.map((collection) => (
              <div key={collection.id} className="lt-card" style={{ overflow: 'hidden' }}>
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                  <div style={{ width: '100%', maxWidth: 140, flexShrink: 0 }}>
                    <BookCover title={collection.title} hue={collection.cover_hue} compact />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#171717' }}>{collection.title}</h2>
                      <span className={`lt-badge ${collection.is_published ? 'lt-badge-success' : ''}`}>
                        {collection.is_published ? 'Published' : 'Hidden'}
                      </span>
                    </div>
                    {collection.description && (
                      <p style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>{collection.description}</p>
                    )}
                    <p style={{ fontSize: 12, color: '#808080' }}>
                      {collection.document_count} book{collection.document_count !== 1 ? 's' : ''} · {new Date(collection.created_at).toLocaleDateString('en-GB')}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                      <button type="button" onClick={() => toggleExpanded(collection.id)} className="lt-btn-secondary" style={{ padding: '7px 12px', fontSize: 12 }}>
                        {expandedId === collection.id ? 'Hide books' : 'View books'}
                      </button>
                      <button type="button" onClick={() => togglePublished(collection)} className="lt-btn-secondary" style={{ padding: '7px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {collection.is_published ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        {collection.is_published ? 'Visible' : 'Hidden'}
                      </button>
                      <button type="button" onClick={() => deleteCollection(collection)} style={{ padding: '7px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, background: '#fff5f5', color: '#c0392b', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                </div>

                {expandedId === collection.id && (
                  <div style={{ borderTop: '1px solid #f0f0f0', padding: '12px 16px 16px', background: '#fafafa' }}>
                    {(documents[collection.id] || []).length === 0 ? (
                      <p style={{ fontSize: 13, color: '#808080' }}>Loading books...</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {(documents[collection.id] || []).map((doc) => (
                          <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#fff', borderRadius: 8, boxShadow: 'rgba(0,0,0,0.06) 0px 0px 0px 1px' }}>
                            <FileArchive size={14} color="#808080" />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: '#171717', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</p>
                              <p style={{ fontSize: 11, color: '#999' }}>{formatBookSize(doc.file_size)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => !uploading && setShowUpload(false)}>
          <div className="lt-card w-full max-w-lg rounded-b-none p-5 sm:rounded-b-[10px]" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Upload book collection</h2>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>ZIP file containing PDF ebooks. Nested folders are supported.</p>

            {error && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: '#fff5f5', padding: '10px 12px', borderRadius: 8, marginBottom: 14, fontSize: 13, color: '#c0392b' }}>
                <AlertTriangle size={14} style={{ marginTop: 2, flexShrink: 0 }} /> {error}
              </div>
            )}

            <form onSubmit={handleUpload}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase' }}>Collection title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="lt-input" style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box' }} placeholder="e.g. Leadership Library" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase' }}>Description (optional)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="lt-input" style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase' }}>ZIP file</label>
                <input type="file" accept=".zip,application/zip" required onChange={(e) => setZipFile(e.target.files?.[0] || null)} className="lt-input" style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box' }} />
              </div>

              {uploadProgress && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#666', marginBottom: 14 }}>
                  <Loader2 size={14} className="animate-spin" /> {uploadProgress}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" disabled={uploading} onClick={() => setShowUpload(false)} className="lt-btn-secondary" style={{ padding: '9px 16px' }}>Cancel</button>
                <button type="submit" disabled={uploading || !zipFile || !title.trim()} className="lt-btn-primary" style={{ padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {uploading ? <><Loader2 size={14} className="animate-spin" /> Processing...</> : <><Upload size={14} /> Upload & extract</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
