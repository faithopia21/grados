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
import { cn, formatDate } from '../../lib/utils';
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [versionChoice, setVersionChoice] = useState<'new' | 'separate' | null>(null);
  const [existingDoc, setExistingDoc] = useState<any>(null);

  const reset = () => {
    setSelectedType('');
    setUploading(false);
    setUploadProgress(0);
    setError('');
    setSelectedFile(null);
    setVersionChoice(null);
    setExistingDoc(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

  const performUpload = async (fileToUpload: File, version: number) => {
    setUploading(true);
    setUploadProgress(10);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const filePath = `${user.id}/${Date.now()}-${fileToUpload.name}`;

    const uploadPromise = supabase.storage
      .from('documents')
      .upload(filePath, fileToUpload, {
        cacheControl: '3600',
        upsert: false
      });

    // Faster progress simulation
    const progressSteps = [30, 50, 70, 85, 95];
    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex < progressSteps.length) {
        setUploadProgress(progressSteps[stepIndex]);
        stepIndex++;
      }
    }, 300); // 300ms between steps

    const { error: uploadError } = await uploadPromise;

    clearInterval(interval);

    if (uploadError) {
      setUploading(false);
      setUploadProgress(0);
      setError(uploadError.message);
      return;
    }

    setUploadProgress(100);
    await new Promise(r => setTimeout(r, 400));
    
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);

    const { data: inserted, error: insertError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        name: fileToUpload.name,
        doc_type: selectedType,
        file_url: urlData.publicUrl,
        file_size: `${(fileToUpload.size / 1024).toFixed(0)} KB`,
        version: version,
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
    toast.success('Document uploaded successfully');
    setUploading(false);
    reset();
    onOpenChange(false);
    onSuccess();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedType) return;

    const MAX_SIZE = 25 * 1024 * 1024; // 25MB
    if (file.size > MAX_SIZE) {
      setError('File too large. Maximum size is 25MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
    setUploading(true);
    setUploadProgress(10);
    setError('');

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setUploading(false);
      setError(userError?.message || 'You must be signed in to upload');
      return;
    }

    const { data: existing } = await supabase
      .from('documents')
      .select('id, name, version, created_at')
      .eq('user_id', user.id)
      .ilike('name', file.name)
      .order('version', { ascending: false })
      .limit(1);

    setUploading(false);
    setUploadProgress(0);

    if (existing && existing.length > 0) {
      setExistingDoc(existing[0]);
      return;
    }

    await performUpload(file, 1);
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
                  disabled={uploading || !!existingDoc}
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

            {existingDoc && selectedFile && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 mb-3 mt-4">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                  A document with this name already exists
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                  "{selectedFile.name}" — Version {existingDoc.version} uploaded on {formatDate(existingDoc.created_at)}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setVersionChoice('new')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      versionChoice === 'new'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-transparent border-border'
                    }`}
                  >
                    Save as Version {(existingDoc.version || 1) + 1}
                  </button>
                  <button
                    onClick={() => setVersionChoice('separate')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      versionChoice === 'separate'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-transparent border-border'
                    }`}
                  >
                    Save as separate document
                  </button>
                </div>
              </div>
            )}

            {uploading && (
              <div className="space-y-2 mt-4">
                <p className="text-sm text-muted-foreground">
                  Uploading {selectedFile?.name} ({selectedFile ? (selectedFile.size / (1024 * 1024)).toFixed(1) : '0'} MB)...
                </p>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {selectedFile && selectedFile.size > 5 * 1024 * 1024 && !uploading && !existingDoc && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                Large file detected. Upload may take a moment on slower connections.
              </p>
            )}

            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleClose(false)} disabled={uploading}>
              Cancel
            </Button>
            {existingDoc ? (
              <Button
                onClick={() => performUpload(selectedFile!, versionChoice === 'new' ? (existingDoc.version || 1) + 1 : 1)}
                disabled={uploading || !versionChoice}
                style={{ backgroundColor: '#4F46E5' }}
                className="text-white hover:opacity-90 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Confirm Upload'}
              </Button>
            ) : (
              <Button
                onClick={handleContinue}
                disabled={uploading || !selectedType}
                style={{ backgroundColor: '#4F46E5' }}
                className="text-white hover:opacity-90 disabled:opacity-50"
              >
                Choose file
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
