import os

path = r"c:\Users\DELL\Downloads\GradOS\src\app\components\upload-document-flow.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "import { ACCEPTED_FILE_TYPES, DOC_TYPE_OPTIONS, type DocTypeValue } from '../../lib/documents';",
    "import { ACCEPTED_FILE_TYPES, DOC_TYPE_OPTIONS, type DocTypeValue } from '../../lib/documents';\nimport { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';\nimport { Input } from './ui/input';"
)

# 2. State
content = content.replace(
    "  const [selectedFile, setSelectedFile] = useState<File | null>(null);",
    "  const [selectedFile, setSelectedFile] = useState<File | null>(null);\n  const [uploadMethod, setUploadMethod] = useState<'file' | 'link'>('file');\n  const [linkUrl, setLinkUrl] = useState('');\n  const [linkName, setLinkName] = useState('');"
)

# 3. Reset
content = content.replace(
    "    setExistingDoc(null);\n    if (fileInputRef.current) {",
    "    setExistingDoc(null);\n    setLinkUrl('');\n    setLinkName('');\n    if (fileInputRef.current) {"
)

# 4. handleContinue
content = content.replace(
"""  const handleContinue = () => {
    if (!selectedType) {
      setError('Please select a document type');
      return;
    }
    setError('');
    fileInputRef.current?.click();
  };""",
"""  const handleContinue = () => {
    if (uploadMethod === 'file') {
      if (!selectedType) {
        setError('Please select a document type');
        return;
      }
      setError('');
      fileInputRef.current?.click();
    } else {
      handleLinkSubmit();
    }
  };"""
)

# 5. performLinkSave & handleLinkSubmit (inserted before handleFileSelect)
link_logic = """
  const performLinkSave = async (name: string, url: string, version: number) => {
    setUploading(true);
    setError('');

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setUploading(false);
      setError(userError?.message || 'You must be signed in');
      return;
    }

    const { data: inserted, error: insertError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        name: name,
        doc_type: selectedType,
        file_url: url,
        file_size: 'Link',
        version: version,
        storage_path: null,
      })
      .select()
      .single();

    if (insertError) {
      setUploading(false);
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
        setError(linkError.message);
        return;
      }
    }

    toast.success('Link added successfully');
    setUploading(false);
    reset();
    onOpenChange(false);
    onSuccess();
  };

  const handleLinkSubmit = async () => {
    if (!selectedType) {
      setError('Please select a document type');
      return;
    }
    if (!linkName.trim() || !linkUrl.trim()) {
      setError('Please provide both a name and a URL');
      return;
    }
    try {
      new URL(linkUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setUploading(true);
    setError('');

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setUploading(false);
      setError(userError?.message || 'You must be signed in');
      return;
    }

    const { data: existing } = await supabase
      .from('documents')
      .select('id, name, version, created_at')
      .eq('user_id', user.id)
      .ilike('name', linkName.trim())
      .order('version', { ascending: false })
      .limit(1);

    setUploading(false);

    if (existing && existing.length > 0) {
      setExistingDoc(existing[0]);
      return;
    }

    await performLinkSave(linkName.trim(), linkUrl.trim(), 1);
  };
"""
content = content.replace("  const handleFileSelect = async", link_logic + "\n  const handleFileSelect = async")


# 6. Re-add accept
content = content.replace(
"""      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
      />""",
"""      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        className="hidden"
        onChange={handleFileSelect}
      />"""
)

# 7. Update JSX
jsx_target = """          <div className="space-y-3 py-2">
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

            {existingDoc && selectedFile && ("""

jsx_replacement = """          <div className="space-y-3 py-2">
            <Tabs value={uploadMethod} onValueChange={(v) => { setUploadMethod(v as 'file' | 'link'); setError(''); setExistingDoc(null); }}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="file">Upload File</TabsTrigger>
                <TabsTrigger value="link">Add Link</TabsTrigger>
              </TabsList>

              <Label>Document type</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 mb-4">
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

              <TabsContent value="link" className="space-y-4">
                <div className="space-y-2">
                  <Label>Link Name</Label>
                  <Input 
                    placeholder="e.g. My Resume (Google Docs)" 
                    value={linkName} 
                    onChange={e => setLinkName(e.target.value)} 
                    disabled={uploading || !!existingDoc} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input 
                    placeholder="https://docs.google.com/..." 
                    value={linkUrl} 
                    onChange={e => setLinkUrl(e.target.value)} 
                    disabled={uploading || !!existingDoc} 
                  />
                </div>
              </TabsContent>
            </Tabs>

            {existingDoc && ("""

content = content.replace(jsx_target, jsx_replacement)


# 8. Update JSX for existingDoc string logic
old_existing = """"{selectedFile.name}" — Version {existingDoc.version}"""
new_existing = """"{uploadMethod === 'file' ? selectedFile?.name : linkName}" — Version {existingDoc.version}"""
content = content.replace(old_existing, new_existing)


# 9. Update JSX for confirm upload logic
old_confirm = """<Button
                onClick={() => performUpload(selectedFile!, versionChoice === 'new' ? (existingDoc.version || 1) + 1 : 1)}"""
new_confirm = """<Button
                onClick={() => uploadMethod === 'file' ? performUpload(selectedFile!, versionChoice === 'new' ? (existingDoc.version || 1) + 1 : 1) : performLinkSave(linkName.trim(), linkUrl.trim(), versionChoice === 'new' ? (existingDoc.version || 1) + 1 : 1)}"""
content = content.replace(old_confirm, new_confirm)

# 10. Update JSX for final button label
old_button = """{uploading ? 'Uploading...' : 'Confirm Upload'}"""
new_button = """{uploading ? (uploadMethod === 'file' ? 'Uploading...' : 'Saving...') : (uploadMethod === 'file' ? 'Confirm Upload' : 'Confirm Link')}"""
content = content.replace(old_button, new_button)

old_choose_file = """Choose file"""
new_choose_file = """{uploadMethod === 'file' ? 'Choose file' : 'Add Link'}"""
content = content.replace(old_choose_file, new_choose_file)


with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated successfully")
