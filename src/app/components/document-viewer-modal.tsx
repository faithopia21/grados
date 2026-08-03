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
  const [fileType, setFileType] = useState<'pdf' | 'docx' | 'unsupported'>('unsupported');

  useEffect(() => {
    const init = async () => {
      setLoading(true);
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
        const { data, error } = await supabase.storage
          .from('documents')
          .createSignedUrl(doc.storage_path, 3600);

        if (error || !data) {
          toast.error('Failed to load document');
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
            toast.error('Failed to parse document');
          }
        }
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/80 backdrop-blur-sm">
      <div className="flex-1 flex flex-col bg-background m-4 md:m-8 rounded-lg border border-border shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{doc.name}</h2>
            <span className="text-xs px-2 py-1 bg-accent text-accent-foreground rounded-full font-medium">
              v{doc.version || 1}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col bg-accent/10">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Loading document...
            </div>
          ) : fileType === 'pdf' && signedUrl ? (
            <iframe 
              src={signedUrl} 
              className="w-full flex-1 rounded-md border border-border bg-white min-h-[70vh]"
              title={doc.name}
            />
          ) : fileType === 'docx' ? (
            <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col min-h-[70vh] bg-background">
              <RichTextEditor
                value={htmlContent}
                onChange={setHtmlContent}
                className="flex-1 h-full"
                minHeight="100%"
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
              <p>Preview not available for this file type. Download to view.</p>
              {doc.file_url && (
                <Button onClick={() => window.open(doc.file_url, '_blank')}>
                  <Download className="h-4 w-4 mr-2" /> Download Document
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-border gap-2 bg-muted/30">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {fileType === 'docx' ? 'Cancel' : 'Close'}
          </Button>
          {fileType === 'docx' && (
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
