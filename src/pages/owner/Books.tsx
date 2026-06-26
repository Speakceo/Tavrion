import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { uploadLargeFile } from '../../utils/chunkedUpload';
import {
  BookCollection,
  BookDocument,
  ZipPdfPreview,
  coverHueFromTitle,
  formatBookSize,
  forEachPdfInZip,
  humanizePdfName,
  sanitizeStorageName,
  scanZipForPdfs,
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
  const [zipScan, setZipScan] = useState<ZipPdfPreview[] | null>(null);
  const [zipScanning, setZipScanning] = useState(false);
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

  const handleZipSelect = async (file: File | null) => {
    setZipFile(file);
    setZipScan(null);
    setError('');
    if (!file) return;

    setZipScanning(true);
    try {
      const pdfs = await scanZipForPdfs(file);
      if (pdfs.length === 0) {
        setError('No PDF files found in this ZIP.');
      } else if (pdfs.some((pdf) => pdf.tooLarge)) {
        const biggest = pdfs.reduce((max, pdf) => (pdf.uncompressedSize > max.uncompressedSize ? pdf : max), pdfs[0]);
        setError(
          `ZIP is fine at ${formatBookSize(file.size)}, but "${biggest.name}" is ${formatBookSize(biggest.uncompressedSize)}. `
          + 'Supabase allows max 50 MB per file — split large PDFs or upgrade your Supabase plan.',
        );
      }
      setZipScan(pdfs);
    } catch (err: any) {
      console.error('ZIP scan failed:', err);
      setError(err.message || 'Could not read ZIP file. Try re-exporting it and upload again.');
    } finally {
      setZipScanning(false);
    }
  };

  const zipHasOversizedPdf = Boolean(zipScan?.some((pdf) => pdf.tooLarge));
  const canUpload = Boolean(zipFile && title.trim() && zipScan && zipScan.length > 0 && !zipHasOversizedPdf && !zipScanning);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zipFile || !title.trim() || !profile || !canUpload) return;

    const sizeMb = zipFile.size / (1024 * 1024);
    if (sizeMb > 2048) {
      setError('ZIP file is too large to process in the browser (max 2GB).');
      return;
    }

    setUploading(true);
    setError('');
    setUploadProgress(`Reading ZIP (${formatBookSize(zipFile.size)})...`);

    let collectionId: string | null = null;
    const uploadedPaths: string[] = [];

    try {
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

      collectionId = collection.id;
      const stamp = Date.now();
      const docRows: Omit<BookDocument, 'id' | 'created_at'>[] = [];

      await forEachPdfInZip(zipFile, async (pdf, index, total) => {
        setUploadProgress(`Uploading ${index + 1} of ${total}: ${pdf.name}`);
        const filePath = `extracted/${collectionId}/${stamp}_${index}_${sanitizeStorageName(pdf.name)}`;
        const file = new File([pdf.blob], pdf.name, { type: 'application/pdf' });

        const upload = await uploadLargeFile({
          bucket: 'book-files',
          path: filePath,
          file,
          contentType: 'application/pdf',
          onProgress: (pct) => setUploadProgress(`Uploading ${index + 1}/${total} ${pdf.name}: ${pct}%`),
        });

        if (!upload.success) {
          throw new Error(upload.error?.message || `Failed to upload ${pdf.name}`);
        }

        uploadedPaths.push(filePath);
        docRows.push({
          collection_id: collectionId!,
          title: humanizePdfName(pdf.name),
          original_filename: pdf.name,
          file_path: filePath,
          file_size: pdf.blob.size,
          sort_order: index,
        });
      }, (stage) => setUploadProgress(stage));

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
      setZipScan(null);
      setUploadProgress('');
      await fetchCollections();
    } catch (err: any) {
      console.error('Book upload failed:', err);
      setError(err.message || 'Upload failed');

      if (uploadedPaths.length > 0) {
        await supabase.storage.from('book-files').remove(uploadedPaths);
      }
      if (collectionId) {
        await supabase.from('book_collections').delete().eq('id', collectionId);
      }
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
            <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
              ZIP can be any size (e.g. 145 MB). PDFs are extracted in your browser and uploaded one by one.
              Each PDF must be under <strong>50 MB</strong> (Supabase plan limit).
            </p>

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
                <input type="file" accept=".zip,application/zip,application/x-zip-compressed,application/octet-stream" required onChange={(e) => void handleZipSelect(e.target.files?.[0] || null)} className="lt-input" style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box' }} />
                {zipFile && (
                  <p style={{ fontSize: 12, color: '#808080', marginTop: 6 }}>
                    Selected: {zipFile.name} ({formatBookSize(zipFile.size)})
                    {zipScanning && ' · scanning...'}
                  </p>
                )}
                {zipScan && zipScan.length > 0 && (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: '#f8f8f8', borderRadius: 8, fontSize: 12, color: '#444' }}>
                    <p style={{ fontWeight: 600, marginBottom: 6 }}>
                      Found {zipScan.length} PDF{zipScan.length !== 1 ? 's' : ''} in ZIP
                      {!zipHasOversizedPdf && ' — ready to upload'}
                    </p>
                    <div style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {zipScan.slice(0, 8).map((pdf) => (
                        <div key={pdf.path} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pdf.name}</span>
                          <span style={{ color: pdf.tooLarge ? '#c0392b' : '#808080', flexShrink: 0 }}>{formatBookSize(pdf.uncompressedSize)}</span>
                        </div>
                      ))}
                      {zipScan.length > 8 && (
                        <p style={{ color: '#808080' }}>+ {zipScan.length - 8} more</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {uploadProgress && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#666', marginBottom: 14 }}>
                  <Loader2 size={14} className="animate-spin" /> {uploadProgress}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" disabled={uploading} onClick={() => setShowUpload(false)} className="lt-btn-secondary" style={{ padding: '9px 16px' }}>Cancel</button>
                <button type="submit" disabled={uploading || !canUpload} className="lt-btn-primary" style={{ padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
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
