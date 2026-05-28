import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { formatTimestamp } from '@/lib/format-timestamp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Image, ArrowLeft, Upload, Search, Trash2, Download, Eye, X, CheckCircle, AlertCircle, Loader2, FolderUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from './layout';
import { Progress } from '@/components/ui/progress';

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

interface MediaFile {
  id: string;
  name: string;
  originalName: string;
  type: 'image' | 'video' | 'document';
  mimeType: string;
  size: number;
  url: string;
  thumbnail?: string | null;
  uploadedBy: string;
  createdAt: string;
}

export default function MediaLibrary() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const { data: mediaFiles = [], isLoading, refetch } = useQuery<MediaFile[]>({
    queryKey: ['/api/admin/media'],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/admin/media', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/media'] });
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await apiRequest('DELETE', `/api/admin/media/${fileId}`);
      return fileId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/media'] });
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    },
  });

  const filteredFiles = mediaFiles.filter((file: MediaFile) => {
    const searchName = (file.originalName || file.name).toLowerCase();
    const matchesSearch = searchName.includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || file.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="h-8 w-8 text-blue-500" />;
      case 'video':
        return <div className="h-8 w-8 bg-purple-500 rounded flex items-center justify-center text-white text-xs">VID</div>;
      case 'document':
        return <div className="h-8 w-8 bg-red-500 rounded flex items-center justify-center text-white text-xs">DOC</div>;
      default:
        return <div className="h-8 w-8 bg-gray-500 rounded flex items-center justify-center text-white text-xs">FILE</div>;
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const handleBulkFileUpload = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const newUploadingFiles: UploadingFile[] = fileArray.map((file, index) => ({
      id: `upload-${Date.now()}-${index}`,
      file,
      progress: 0,
      status: 'uploading' as const,
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    newUploadingFiles.forEach((uploadingFile) => {
      uploadFileToServer(uploadingFile);
    });
  };

  const uploadFileToServer = async (uploadingFile: UploadingFile) => {
    try {
      setUploadingFiles(prev =>
        prev.map(f =>
          f.id === uploadingFile.id ? { ...f, progress: 30 } : f
        )
      );

      const formData = new FormData();
      formData.append('file', uploadingFile.file);
      
      const response = await fetch('/api/admin/media', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      setUploadingFiles(prev =>
        prev.map(f =>
          f.id === uploadingFile.id ? { ...f, progress: 70 } : f
        )
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      await response.json();
      
      setUploadingFiles(prev =>
        prev.map(f =>
          f.id === uploadingFile.id ? { ...f, status: 'completed', progress: 100 } : f
        )
      );
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/media'] });
    } catch (error) {
      setUploadingFiles(prev =>
        prev.map(f =>
          f.id === uploadingFile.id ? { ...f, status: 'error', error: 'Upload failed' } : f
        )
      );
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleBulkFileUpload(files);
    }
  };

  const handleBulkInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleBulkFileUpload(files);
    }
  };

  const removeUploadingFile = (id: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearCompletedUploads = () => {
    setUploadingFiles(prev => prev.filter(f => f.status !== 'completed'));
  };

  const activeUploads = uploadingFiles.filter(f => f.status === 'uploading');
  const completedUploads = uploadingFiles.filter(f => f.status === 'completed');

  const handleViewFile = (file: MediaFile) => {
    window.open(file.url, '_blank');
  };

  const handleDownloadFile = (file: MediaFile) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    target.style.display = 'none';
    const parent = target.parentElement;
    if (parent) {
      parent.innerHTML = '<div class="flex flex-col items-center justify-center h-full text-gray-400"><svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><span class="text-xs mt-1">Image</span></div>';
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard">
            <Button variant="outline" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-media-library">
              Media Library
            </h1>
            <p className="text-gray-600">Manage images, videos, and documents</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Image className="h-5 w-5" />
                <span>Media Files</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  data-testid="input-file-upload"
                />
                <input
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  onChange={handleBulkInputChange}
                  className="hidden"
                  id="bulk-file-upload"
                  multiple
                  data-testid="input-bulk-file-upload"
                />
                <Button 
                  variant="outline" 
                  onClick={() => setShowBulkUpload(!showBulkUpload)}
                  data-testid="button-toggle-bulk-upload"
                >
                  <FolderUp className="h-4 w-4 mr-2" />
                  Bulk Upload
                </Button>
                <Button asChild disabled={uploadMutation.isPending}>
                  <label htmlFor="file-upload" className="cursor-pointer" data-testid="button-upload">
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
                  </label>
                </Button>
              </div>
            </CardTitle>
            <CardDescription>Upload and manage media files for your platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showBulkUpload && (
              <div className="space-y-4">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragOver 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  data-testid="bulk-upload-dropzone"
                >
                  <FolderUp className={`h-12 w-12 mx-auto mb-4 ${isDragOver ? 'text-primary' : 'text-gray-400'}`} />
                  <h3 className="text-lg font-medium mb-2">Drag & Drop Files Here</h3>
                  <p className="text-gray-500 mb-4">or click to browse and select multiple files</p>
                  <Button asChild variant="outline">
                    <label htmlFor="bulk-file-upload" className="cursor-pointer" data-testid="button-browse-files">
                      <Upload className="h-4 w-4 mr-2" />
                      Browse Files
                    </label>
                  </Button>
                  <p className="text-xs text-gray-400 mt-4">
                    Supports: Images (JPG, PNG, GIF), Videos (MP4, MOV), Documents (PDF, DOC, DOCX)
                  </p>
                </div>

                {uploadingFiles.length > 0 && (
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">
                        Upload Progress 
                        {activeUploads.length > 0 && (
                          <span className="text-sm font-normal text-gray-500 ml-2">
                            ({activeUploads.length} uploading, {completedUploads.length} completed)
                          </span>
                        )}
                      </h4>
                      {completedUploads.length > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={clearCompletedUploads}
                          data-testid="button-clear-completed"
                        >
                          Clear Completed
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {uploadingFiles.map((uploadFile) => (
                        <div 
                          key={uploadFile.id} 
                          className="flex items-center gap-3 p-2 bg-gray-50 rounded"
                          data-testid={`uploading-file-${uploadFile.id}`}
                        >
                          <div className="flex-shrink-0">
                            {uploadFile.status === 'uploading' && (
                              <Loader2 className="h-5 w-5 text-primary animate-spin" />
                            )}
                            {uploadFile.status === 'completed' && (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            )}
                            {uploadFile.status === 'error' && (
                              <AlertCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{uploadFile.file.name}</p>
                            <div className="flex items-center gap-2">
                              <Progress value={uploadFile.progress} className="h-1.5 flex-1" />
                              <span className="text-xs text-gray-500 w-12 text-right">
                                {Math.round(uploadFile.progress)}%
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-shrink-0 h-8 w-8 p-0"
                            onClick={() => removeUploadingFile(uploadFile.id)}
                            data-testid={`button-remove-upload-${uploadFile.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-files"
                />
              </div>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40" data-testid="select-type-filter">
                  <SelectValue placeholder="File Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                  <SelectItem value="document">Documents</SelectItem>
                </SelectContent>
              </Select>

              <Select value={viewMode} onValueChange={setViewMode}>
                <SelectTrigger className="w-32" data-testid="select-view-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid">Grid</SelectItem>
                  <SelectItem value="list">List</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredFiles.map((file: MediaFile) => (
                  <Card key={file.id} className="p-2" data-testid={`file-${file.id}`}>
                    <div className="aspect-square bg-gray-100 rounded flex items-center justify-center mb-2 overflow-hidden">
                      {file.type === 'image' ? (
                        <img
                          src={file.thumbnail || file.url}
                          alt={file.name}
                          className="w-full h-full object-cover rounded"
                          onError={handleImageError}
                        />
                      ) : (
                        getFileIcon(file.type)
                      )}
                    </div>
                    <div className="text-xs">
                      <p className="font-medium truncate" data-testid={`text-filename-${file.id}`} title={file.originalName || file.name}>
                        {file.originalName || file.name}
                      </p>
                      <p className="text-gray-500" data-testid={`text-filesize-${file.id}`}>
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleViewFile(file)}
                        data-testid={`button-view-${file.id}`}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => deleteMutation.mutate(file.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${file.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFiles.map((file: MediaFile) => (
                  <div key={file.id} className="flex items-center justify-between p-3 border rounded" data-testid={`file-row-${file.id}`}>
                    <div className="flex items-center space-x-3">
                      {getFileIcon(file.type)}
                      <div>
                        <p className="font-medium" data-testid={`text-filename-${file.id}`}>
                          {file.originalName || file.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(file.size)} • Uploaded {formatTimestamp(file.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDownloadFile(file)}
                        data-testid={`button-download-${file.id}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleViewFile(file)}
                        data-testid={`button-view-${file.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => deleteMutation.mutate(file.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${file.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {filteredFiles.length === 0 && (
              <div className="text-center py-8" data-testid="no-files-message">
                <Image className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchQuery || typeFilter !== 'all' ? 'No files found matching your criteria.' : 'No files uploaded yet.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}