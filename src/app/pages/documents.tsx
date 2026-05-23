import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Input } from '../components/ui/input';
import { UploadDocumentFlow } from '../components/upload-document-flow';
import { PageSkeleton } from '../components/page-skeleton';
import { supabase } from '../../lib/supabase';
import {
  type DbDocument,
  DOC_FILTER_TABS,
  formatDocumentDate,
  getDocTypeBadgeClass,
  getDocTypeLabel,
  getStoragePath,
  getTotalStorageMb,
  matchesDocFilter,
} from '../../lib/documents';
import { cn } from '../../lib/utils';
import { FileText, Upload, Download, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../components/page-header';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { OfflinePage } from '../components/offline-page';

function DocumentRowSkeleton() {
  return <Skeleton className="h-20 w-full rounded-lg" />;
}

export function Documents() {
  const [documents, setDocuments] = useState<DbDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [fetchError, setFetchError] = useState(false);
  const isOnline = useOnlineStatus();

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setDeleteError('');

    if (!navigator.onLine) {
      setFetchError(true);
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setDocuments([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setFetchError(false);
      setDocuments((data ?? []) as DbDocument[]);
    } catch (err: any) {
      if (
        !navigator.onLine ||
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('network') ||
        err.code === 'NETWORK_ERROR'
      ) {
        setFetchError(true);
      } else {
        toast.error('Failed to load data');
        setFetchError(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Auto-retry when coming back online
  useEffect(() => {
    if (isOnline && fetchError) {
      setFetchError(false);
      fetchDocuments();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const storage = useMemo(() => getTotalStorageMb(documents), [documents]);

  const filteredDocuments = useMemo(() => {
    let list = documents.filter(d => matchesDocFilter(d, activeFilter));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d => d.name.toLowerCase().includes(q));
    }
    return list;
  }, [documents, activeFilter, searchQuery]);

  const handleDownload = async (doc: DbDocument) => {
    const storagePath = doc.storage_path?.trim();
    if (storagePath) {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(storagePath, 3600);

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
        return;
      }

      if (error) {
        toast.error(error.message);
        return;
      }
    }

    if (doc.file_url?.trim()) {
      window.open(doc.file_url, '_blank');
      return;
    }

    toast.error('Could not download file');
  };

  const handleDelete = async (doc: DbDocument) => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;

    const filePath = getStoragePath(doc);
    if (filePath) {
      const { error: storageError } = await supabase.storage.from('documents').remove([filePath]);
      if (storageError) {
        setDeleteError(storageError.message);
        return;
      }
    }

    const { error } = await supabase.from('documents').delete().eq('id', doc.id);

    if (error) {
      setDeleteError(error.message);
      return;
    }

    setDocuments(prev => prev.filter(d => d.id !== doc.id));
    toast.success('Document deleted');
  };

  if (loading) return <PageSkeleton />;

  if (fetchError || !isOnline) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <PageHeader
          title="Documents Hub"
          subtitle="Centralised library for all your documents"
          backTo="/dashboard"
        />
        <OfflinePage
          onRetry={() => { setFetchError(false); fetchDocuments(); }}
          pageName="your documents"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader 
        title="Documents Hub"
        subtitle="Centralised library for all your documents"
        backTo="/dashboard"
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload New Document
          </Button>
        </div>

      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {storage.usedMb < 0.1
              ? '0 MB'
              : `${storage.usedMb < 1 ? storage.usedMb.toFixed(2) : storage.usedMb.toFixed(1)} MB`}{' '}
            of {storage.limitMb} MB used
          </p>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-2 rounded-full transition-all"
            style={{ width: `${storage.percent}%`, backgroundColor: '#4F46E5' }}
          />
        </div>
      </div>

      {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}

      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg mb-2">No documents yet</h2>
          <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
            Upload your SOP, CV, and transcripts once — then attach them to any application.
          </p>
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload your first document
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {DOC_FILTER_TABS.map(tab => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveFilter(tab.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm border transition-colors',
                    activeFilter === tab.value
                      ? 'border-[#4F46E5] bg-[#4F46E5] text-white'
                      : 'border-border bg-background hover:bg-accent'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your documents</CardTitle>
              <CardDescription>
                {filteredDocuments.length}{' '}
                {filteredDocuments.length === 1 ? 'document' : 'documents'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredDocuments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No documents match your search or filter.
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredDocuments.map(doc => (
                    <div
                      key={doc.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <Badge
                              className={cn('text-xs border-0', getDocTypeBadgeClass(doc.doc_type))}
                            >
                              {getDocTypeLabel(doc.doc_type)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">v{doc.version}</span>
                          </div>
                          <p className="text-sm font-medium truncate">{doc.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDocumentDate(doc.created_at)} · {doc.file_size}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => handleDownload(doc)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(doc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <UploadDocumentFlow
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSuccess={fetchDocuments}
      />
      </div>
    </div>
  );
}
