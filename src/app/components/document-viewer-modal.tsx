import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { htmlToDocxBlob } from '../../lib/html-to-docx';
import { RichTextEditor } from './rich-text-editor';
import { Button } from './ui/button';
import { X, Download } from 'lucide-react';
import { toast } from 'sonner';
import mammoth from 'mammoth';
import { type DbDocument } from '../../lib/documents';

interface DocumentViewerModalProps {
  doc: DbDocument;
  onClose: () => void;
  onSaved?: () => void;
}

export function DocumentViewerModal({ doc, onClose, onSaved }: DocumentViewerModalProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'docx' | 'unsupported'>('unsupported');

  useEffect(() => {
    const init = async () => {
      if (!doc) return;
      setLoading(true);
      setError(null);
      const ext = doc.name.split('.').pop()?.toLowerCase();
      
      if (ext === 'pdf') {
        setFileType('pdf');
      } else if (ext === 'docx' || ext === 'doc') {
        setFileType('docx');
      } else {
        setFileType('unsupported');
        setLoading(false);
        return;
      }

      if (doc.storage_path) {
        const { data, error: err } = await supabase.storage
          .from('documents')
          .createSignedUrl(doc.storage_path, 3600);

        if (err || !data?.signedUrl) {
          setError('Could not load this document');
          setLoading(false);
          return;
        }

        setSignedUrl(data.signedUrl);

        if (ext === 'docx' || ext === 'doc') {
          try {
            const response = await fetch(data.signedUrl);
            const arrayBuffer = await response.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            setHtmlContent(result.value);
          } catch (err) {
            setError('Failed to parse document');
          }
        }
      } else if (doc.file_url) {
        setSignedUrl(doc.file_url);
      } else {
        setError('No valid file source found');
      }
      setLoading(false);
    };

    init();
  }, [doc]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const blob = await htmlToDocxBlob(htmlContent);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newVersion = (doc.version || 1) + 1;
      const safeName = doc.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${user.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, blob, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from('documents')
        .insert({
          user_id: user.id,
          name: doc.name,
          doc_type: doc.doc_type,
          file_url: '',
          file_size: `${(blob.size / 1024).toFixed(0)} KB`,
          version: newVersion,
          storage_path: filePath,
        });

      if (insertError) throw insertError;

      toast.success(`Saved as version ${newVersion}`);
      onSaved?.();
      onClose();
    } catch (err: any) {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    } else if (doc.file_url) {
      window.open(doc.file_url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-0 md:inset-8 z-[60] bg-background md:rounded-xl flex flex-col overflow-hidden shadow-2xl border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-border bg-muted/10 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <h2 className="text-base md:text-lg font-semibold truncate">{doc.name}</h2>
            <span className="text-xs px-2 py-0.5 bg-accent text-accent-foreground rounded-full font-medium shrink-0">
              v{doc.version || 1}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 ml-2">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col bg-accent/5">
          {loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">
                Loading document...
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
              <p className="text-sm text-red-600">
                {error}
              </p>
              <button onClick={handleDownload} className="text-sm text-indigo-600 hover:underline">
                Download instead
              </button>
            </div>
          )}

          {!loading && !error && signedUrl && fileType === 'pdf' && (
            <iframe
              src={/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) 
                ? `https://docs.google.com/viewer?url=${encodeURIComponent(signedUrl)}&embedded=true` 
                : signedUrl}
              className="w-full h-full border-0"
              title={doc.name}
            />
          )}

          {!loading && !error && fileType === 'docx' && (
            <div className="flex-1 w-full flex flex-col h-full overflow-hidden">
              <RichTextEditor
                value={htmlContent}
                onChange={setHtmlContent}
                className="flex-1 h-full border-none rounded-none"
                variant="page"
              />
            </div>
          )}

          {!loading && !error && fileType === 'unsupported' && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 px-6 text-center">
              <p>Preview not available for this file type. Download to view.</p>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" /> Download Document
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && fileType === 'docx' && (
          <div className="flex items-center justify-end p-3 md:p-4 border-t border-border gap-2 bg-muted/10 shrink-0">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
