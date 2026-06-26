import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  BookCollection,
  BookDocument,
  formatBookSize,
  getBookFileUrl,
  isBooksFeatureEnabled,
} from '../utils/books';
import { BookCover } from '../components/BookCover';
import { PdfViewerModal } from '../components/PdfViewerModal';
import { ArrowLeft, BookOpen, ChevronRight, Library } from 'lucide-react';

export function Books() {
  const { collectionId, documentId } = useParams<{ collectionId?: string; documentId?: string }>();
  const { organization, profile } = useAuth();
  const navigate = useNavigate();
  const booksEnabled = profile?.is_platform_owner || isBooksFeatureEnabled(organization?.features);

  const [collections, setCollections] = useState<BookCollection[]>([]);
  const [collection, setCollection] = useState<BookCollection | null>(null);
  const [documents, setDocuments] = useState<BookDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [readerDoc, setReaderDoc] = useState<BookDocument | null>(null);

  useEffect(() => {
    if (!booksEnabled) {
      setLoading(false);
      return;
    }
    if (collectionId) {
      fetchCollection(collectionId);
    } else {
      fetchCollections();
    }
  }, [collectionId, booksEnabled]);

  useEffect(() => {
    if (!documentId || !documents.length) return;
    const doc = documents.find((d) => d.id === documentId);
    if (doc) setReaderDoc(doc);
  }, [documentId, documents]);

  const fetchCollections = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('book_collections')
      .select('*')
      .eq('is_published', true)
      .gt('document_count', 0)
      .order('created_at', { ascending: false });
    setCollections(data || []);
    setLoading(false);
  };

  const fetchCollection = async (id: string) => {
    setLoading(true);
    const [{ data: col }, { data: docs }] = await Promise.all([
      supabase.from('book_collections').select('*').eq('id', id).eq('is_published', true).maybeSingle(),
      supabase.from('book_documents').select('*').eq('collection_id', id).order('sort_order', { ascending: true }),
    ]);
    setCollection(col);
    setDocuments(docs || []);
    setLoading(false);
  };

  const openReader = (doc: BookDocument) => {
    setReaderDoc(doc);
    if (collectionId) {
      navigate(`/books/${collectionId}/read/${doc.id}`, { replace: true });
    }
  };

  const closeReader = () => {
    setReaderDoc(null);
    if (collectionId) {
      navigate(`/books/${collectionId}`, { replace: true });
    }
  };

  if (!booksEnabled) {
    return (
      <Layout>
        <div className="lt-card" style={{ maxWidth: 480, margin: '40px auto', padding: 32, textAlign: 'center' }}>
          <Library size={32} color="#ccc" style={{ margin: '0 auto 12px' }} />
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Books not available</h1>
          <p style={{ fontSize: 14, color: '#666' }}>The Books feature is not enabled for your organisation. Contact your administrator.</p>
          <Link to="/dashboard" className="lt-btn-primary" style={{ display: 'inline-block', marginTop: 20, padding: '9px 16px', textDecoration: 'none' }}>
            Back to dashboard
          </Link>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div className="lt-spinner" />
        </div>
      </Layout>
    );
  }

  if (collectionId && collection) {
    return (
      <Layout>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Link to="/books" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#808080', textDecoration: 'none', marginBottom: 16 }}>
            <ArrowLeft size={13} /> All collections
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" style={{ marginBottom: 24 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#808080', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Books</p>
              <h1 style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800, letterSpacing: '-0.04em', color: '#171717' }}>{collection.title}</h1>
              {collection.description && <p style={{ fontSize: 14, color: '#666', marginTop: 6 }}>{collection.description}</p>}
              <p style={{ fontSize: 12, color: '#999', marginTop: 8 }}>{documents.length} book{documents.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {documents.length === 0 ? (
            <div className="lt-card" style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: '#666' }}>No books in this collection yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => openReader(doc)}
                  style={{ textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <BookCover title={doc.title} hue={collection.cover_hue} filePath={doc.file_path} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#171717', marginTop: 10, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {doc.title}
                  </p>
                  <p style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{formatBookSize(doc.file_size)}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {readerDoc && (
          <PdfViewerModal
            title={readerDoc.title}
            url={getBookFileUrl(readerDoc.file_path)}
            onClose={closeReader}
          />
        )}
      </Layout>
    );
  }

  if (collectionId && !collection) {
    return (
      <Layout>
        <div className="lt-card" style={{ maxWidth: 480, margin: '40px auto', padding: 32, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>Collection not found or unavailable.</p>
          <Link to="/books" style={{ fontSize: 13, color: '#171717', fontWeight: 600 }}>← Back to books</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#808080', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Library</p>
          <h1 style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800, letterSpacing: '-0.04em', color: '#171717', marginBottom: 4 }}>Books</h1>
          <p style={{ fontSize: 14, color: '#666' }}>Browse PDF ebooks uploaded by your organisation.</p>
        </div>

        {collections.length === 0 ? (
          <div className="lt-card" style={{ padding: 48, textAlign: 'center' }}>
            <BookOpen size={32} color="#ccc" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, color: '#666' }}>No book collections available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((col) => (
              <Link key={col.id} to={`/books/${col.id}`} className="lt-card" style={{ padding: 16, textDecoration: 'none', display: 'block', transition: 'transform 0.15s' }}>
                <BookCover title={col.title} hue={col.cover_hue} />
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginTop: 14 }}>
                  <div style={{ minWidth: 0 }}>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: '#171717', marginBottom: 4 }}>{col.title}</h2>
                    {col.description && (
                      <p style={{ fontSize: 12, color: '#666', marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{col.description}</p>
                    )}
                    <p style={{ fontSize: 11, color: '#999' }}>{col.document_count} book{col.document_count !== 1 ? 's' : ''}</p>
                  </div>
                  <ChevronRight size={16} color="#ccc" style={{ flexShrink: 0, marginTop: 2 }} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
