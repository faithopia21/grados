import { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { supabase } from '../../lib/supabase';
import { ACCEPTED_FILE_TYPES, DOC_TYPE_OPTIONS, type DocTypeValue } from '../../lib/documents';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface UploadDocumentFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  linkToProgramId?: string;
}

export function UploadDocumentFlow({
  open,
  onOpenChange,
  onSuccess,
  linkToProgramId,
}: UploadDocumentFlowProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState<DocTypeValue | ''>('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  const reset = () => {
    setSelectedType('');
    setUploading(false);
    setUploadProgress(0);
    setError('');
  };

  const handleClose = (next: boolean) => {
    if (!uploading) {
      onOpenChange(next);
      if (!next) reset();
    }
  };

  const handleContinue = () => {
    if (!selectedType) {
      setError('Please select a document type');
      return;
    }
    setError('');
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedType) return;

    setUploading(true);
    setUploadProgress(30);
    setError('');

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setUploading(false);
      setError(userError?.message || 'You must be signed in to upload');
      return;
    }

    const filePath = `${user.id}/${Date.now()}-${file.name}`;

    setUploadProgress(50);

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) {
      setUploading(false);
      setUploadProgress(0);
      setError(uploadError.message);
      return;
    }

    setUploadProgress(75);

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);

    const { data: inserted, error: insertError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        name: file.name,
        doc_type: selectedType,
        file_url: urlData.publicUrl,
        file_size: `${(file.size / 1024).toFixed(0)} KB`,
        version: 1,
        storage_path: filePath,
      })
      .select()
      .single();

    if (insertError) {
      await supabase.storage.from('documents').remove([filePath]);
      setUploading(false);
      setUploadProgress(0);
      setError(insertError.message);
      return;
    }

    if (linkToProgramId && inserted) {
      const { error: linkError } = await supabase.from('program_documents').insert({
        program_id: linkToProgramId,
        document_id: inserted.id,
      });

      if (linkError) {
        setUploading(false);
        setUploadProgress(0);
        setError(linkError.message);
        return;
      }
    }

    setUploadProgress(100);
    toast.success('Document uploaded');
    setUploading(false);
    reset();
    onOpenChange(false);
    onSuccess();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        className="hidden"
        onChange={handleFileSelect}
      />
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload document</DialogTitle>
            <DialogDescription>
              Choose a document type, then select a PDF, DOCX, or TXT file.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label>Document type</Label>
            <div className="grid grid-cols-2 gap-2">
              {DOC_TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={uploading}
                  onClick={() => setSelectedType(opt.value)}
                  className={cn(
                    'px-3 py-2 rounded-md border text-sm text-left transition-colors',
                    selectedType === opt.value
                      ? 'border-[#4F46E5] bg-[#4F46E5] text-white'
                      : 'border-border hover:bg-accent'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {uploading && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Uploading...</p>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleClose(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button
              onClick={handleContinue}
              disabled={uploading || !selectedType}
              style={{ backgroundColor: '#4F46E5' }}
              className="text-white hover:opacity-90"
            >
              {uploading ? 'Uploading...' : 'Choose file'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
