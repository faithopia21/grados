import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelection } from '../../hooks/useSelection';
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
import { Checkbox } from '../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { FileText, Upload, Download, Trash2, Search, AlertTriangle, ArrowUp, ArrowDown, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
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
  const [sortOption, setSortOption] = useState('recent');
  const [showFilter, setShowFilter] = useState(false);
  const activeFilterCount = activeFilter !== 'all' ? 1 : 0;
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [fetchError, setFetchError] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const isOnline = useOnlineStatus();

  const {
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelectionMode,
  } = useSelection();

  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    const idsToDelete = Array.from(selectedIds);
    try {
      const docsToDelete = documents.filter(d => selectedIds.has(d.id));
      const pathsToRemove = docsToDelete.map(getStoragePath).filter(Boolean) as string[];

      if (pathsToRemove.length > 0) {
        const { error: storageError } = await supabase.storage.from('documents').remove(pathsToRemove);
        if (storageError) throw storageError;
      }

      const { error } = await supabase.from('documents').delete().in('id', idsToDelete);
      if (error) throw error;

      setDocuments(prev => prev.filter(d => !selectedIds.has(d.id)));
      clearSelection();
      setShowBulkDeleteModal(false);
      toast.success(`${idsToDelete.length} documents deleted`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete documents');
    } finally {
      setIsBulkDeleting(false);
    }
  };

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
        toast.error('Failed to load documents');
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

  const handleDelete = async (doc: DbDocument) => {
    setDeleteError('');
    try {
      const path = getStoragePath(doc);
      if (path) {
        const { error: storageError } = await supabase.storage.from('documents').remove([path]);
        if (storageError) throw storageError;
      }

      const { error: dbError } = await supabase.from('documents').delete().eq('id', doc.id);
      if (dbError) throw dbError;

      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      if (selectedIds.has(doc.id)) {
        toggleSelection(doc.id, false);
      }
      toast.success('Document deleted');
    } catch (err: any) {
      console.error('Delete error:', err);
      toast.error(err.message || 'Failed to delete document');
      setDeleteError(err.message || 'Failed to delete document. Please try again.');
    }
  };

  const handleDownload = async (doc: DbDocument) => {
    try {
      if (doc.storage_path) {
        const { data, error } = await supabase.storage
          .from('documents')
          .createSignedUrl(doc.storage_path, 60);

        if (error) throw error;
        if (data?.signedUrl) {
          window.open(data.signedUrl, '_blank');
        }
      } else if (doc.file_url) {
        window.open(doc.file_url, '_blank');
      }
    } catch (err: any) {
      console.error('Download error:', err);
      toast.error('Failed to download document');
    }
  };

  const filteredDocuments = useMemo(() => {
    let filtered = documents;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => {
        const typeLabel = getDocTypeLabel(doc.doc_type).toLowerCase();
        return doc.name.toLowerCase().includes(query) || typeLabel.includes(query);
      });
    }

    if (activeFilter !== 'all') {
      filtered = filtered.filter(doc => matchesDocFilter(doc.doc_type, activeFilter));
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortOption === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortOption === 'size') {
        const getSizeMB = (sizeStr: string) => {
          const sizeNum = parseFloat(sizeStr || '0');
          if (sizeStr?.includes('MB')) return sizeNum;
          if (sizeStr?.includes('KB')) return sizeNum / 1024;
          return 0;
        };
        return getSizeMB(b.file_size || '') - getSizeMB(a.file_size || '');
      } else {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return timeB - timeA;
      }
    });

    return filtered;
  }, [documents, searchQuery, activeFilter, sortOption]);

  const totalStorageMB = useMemo(() => {
    return documents.reduce((total, doc) => {
      const sizeStr = doc.file_size || '0 KB';
      const sizeNum = parseFloat(sizeStr);
      
      if (sizeStr.includes('MB')) {
        return total + sizeNum;
      } else if (sizeStr.includes('KB')) {
        return total + (sizeNum / 1024);
      }
      return total;
    }, 0);
  }, [documents]);

  if (loading) return <PageSkeleton />;

  if (fetchError || !isOnline) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <PageHeader
          title="Documents"
          subtitle="Manage all your application documents"
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
        title="All Documents"
        subtitle="Manage your application materials across all schools"
        backTo="/dashboard"
      />

      {/* Storage usage bar */}
      <div className="px-4 md:px-6 py-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Storage used</span>
          <span className="text-xs text-muted-foreground">
            {totalStorageMB.toFixed(1)} MB of 50 MB
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5">
          <div 
            className="bg-indigo-600 h-1.5 rounded-full transition-all"
            style={{ width: `${Math.min((totalStorageMB / 50) * 100, 100)}%` }}
          />
        </div>
        {totalStorageMB > 40 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Storage almost full. Consider removing unused documents.
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {deleteError && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{deleteError}</p>
          </div>
        )}



        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 border rounded-xl bg-card">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium mb-2">No documents yet</h2>
            <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
              Upload your CV, transcripts, and statements to use them across your applications.
            </p>
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {/* DESKTOP TOOLBAR */}
              <div className="hidden md:flex items-center gap-2 px-6 py-3">
                <div className="relative flex-1 min-w-0">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                
                <select
                  value={sortOption}
                  onChange={e => setSortOption(e.target.value)}
                  className="py-2 px-3 text-sm border border-border rounded-lg bg-background focus:outline-none w-44 flex-shrink-0"
                >
                  <option value="recent">Recently Added</option>
                  <option value="name">Name A-Z</option>
                  <option value="size">File Size</option>
                </select>
                
                <button
                  onClick={() => setShowFilter(!showFilter)}
                  className="flex items-center gap-2 py-2 px-3 text-sm border border-border rounded-lg hover:bg-accent flex-shrink-0 relative"
                >
                  <Filter size={14} />
                  Filter
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white text-xs rounded-full flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                
                <button
                  onClick={() => setUploadOpen(true)}
                  className="flex items-center gap-2 py-2 px-4 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex-shrink-0"
                >
                  <Upload size={14} />
                  Upload Document
                </button>
              </div>

              {/* MOBILE TOOLBAR */}
              <div className="flex md:hidden items-center gap-2 px-4 py-3">
                <div className="relative flex-1 min-w-0">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                
                <select
                  value={sortOption}
                  onChange={e => setSortOption(e.target.value)}
                  className="py-2 px-2 text-sm border border-border rounded-lg bg-background focus:outline-none flex-shrink-0 w-24"
                >
                  <option value="recent">Recent</option>
                  <option value="name">Name</option>
                  <option value="size">Size</option>
                </select>
                
                <button
                  onClick={() => setShowFilter(!showFilter)}
                  className="p-2 border border-border rounded-lg hover:bg-accent flex-shrink-0 relative"
                >
                  <Filter size={16} />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white text-xs rounded-full flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>

              {showFilter && (
                <div className="flex flex-wrap gap-2">
                  {DOC_FILTER_TABS.map(tab => (
                    <Badge
                      key={tab.id}
                      variant={activeFilter === tab.id ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => setActiveFilter(tab.id)}
                    >
                      {tab.label}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {isSelectionMode && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center justify-between sticky top-0 z-10 mb-4">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    checked={selectedIds.size === filteredDocuments.length && filteredDocuments.length > 0}
                    onCheckedChange={() => selectAll(filteredDocuments.map(d => d.id))}
                  />
                  <span className="text-sm font-medium">
                    {selectedIds.size} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setShowBulkDeleteModal(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </Button>
                </div>
              </div>
            )}

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
                    {filteredDocuments.map(doc => {
                      const isSelected = selectedIds.has(doc.id);
                      const isLatest = !documents.some(
                        d => d.name === doc.name && 
                             d.version > doc.version
                      );
                      return (
                      <div
                        key={doc.id}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          toggleSelection(doc.id, true);
                        }}
                        onClick={(e) => {
                          if (isSelectionMode) {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleSelection(doc.id);
                          }
                        }}
                        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border transition-colors ${isSelected ? 'border-[#4F46E5] bg-[#4F46E5]/5' : 'border-border hover:bg-accent/50'} ${isSelectionMode ? 'cursor-pointer' : ''}`}
                      >
                        <div className="flex items-start gap-3 min-w-0 pointer-events-none">
                          <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <Badge
                                className={cn('text-xs border-0', getDocTypeBadgeClass(doc.doc_type))}
                              >
                                {getDocTypeLabel(doc.doc_type)}
                              </Badge>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                                v{doc.version}
                              </span>
                              {isLatest && doc.version > 1 && (
                                <span className="text-xs text-green-600 dark:text-green-400 font-medium ml-1">
                                  Latest
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium truncate">{doc.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDocumentDate(doc.created_at)} · {doc.file_size}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleDelete(doc); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )})}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

      <Dialog open={showBulkDeleteModal} onOpenChange={setShowBulkDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Documents
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to delete {selectedIds.size} selected {selectedIds.size === 1 ? 'document' : 'documents'}? This action is <strong>irreversible</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowBulkDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={isBulkDeleting}>
              {isBulkDeleting ? 'Deleting...' : 'Yes, delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UploadDocumentFlow
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSuccess={fetchDocuments}
      />
      
      <button
        onClick={() => setUploadOpen(true)}
        className="md:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg flex items-center justify-center transition-colors"
        aria-label="Upload document"
      >
        <Upload size={22} />
      </button>
      </div>
    </div>
  );
}
