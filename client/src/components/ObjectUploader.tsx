import { useState, useRef } from "react";
import type { ReactNode, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, Upload, Image as ImageIcon, CheckCircle2, AlertCircle } from "lucide-react";

interface UploadedFile {
  name: string;
  objectPath: string;
  size: number;
  status: "uploading" | "complete" | "error";
  progress: number;
  error?: string;
}

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  accept?: string;
  onComplete?: (files: UploadedFile[]) => void;
  onFileUploaded?: (file: UploadedFile) => void;
  buttonClassName?: string;
  children: ReactNode;
  multiple?: boolean;
}

export function ObjectUploader({
  maxNumberOfFiles = 10,
  maxFileSize = 10485760,
  accept = "image/*",
  onComplete,
  onFileUploaded,
  buttonClassName,
  children,
  multiple = true,
}: ObjectUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const filesToUpload = selectedFiles.slice(0, maxNumberOfFiles);
    setIsUploading(true);

    const uploadedFiles: UploadedFile[] = [];

    for (const file of filesToUpload) {
      if (file.size > maxFileSize) {
        const errorFile: UploadedFile = {
          name: file.name,
          objectPath: "",
          size: file.size,
          status: "error",
          progress: 0,
          error: `File too large (max ${Math.round(maxFileSize / 1024 / 1024)}MB)`,
        };
        uploadedFiles.push(errorFile);
        continue;
      }

      const uploadingFile: UploadedFile = {
        name: file.name,
        objectPath: "",
        size: file.size,
        status: "uploading",
        progress: 10,
      };

      setFiles((prev) => [...prev, uploadingFile]);

      try {
        const response = await fetch("/api/uploads/request-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            size: file.size,
            contentType: file.type || "application/octet-stream",
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get upload URL");
        }

        const { uploadURL, objectPath } = await response.json();

        setFiles((prev) =>
          prev.map((f) =>
            f.name === file.name ? { ...f, progress: 50 } : f
          )
        );

        const uploadResponse = await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "application/octet-stream" },
        });

        if (!uploadResponse.ok) {
          throw new Error("Upload failed");
        }

        const completedFile: UploadedFile = {
          name: file.name,
          objectPath,
          size: file.size,
          status: "complete",
          progress: 100,
        };

        setFiles((prev) =>
          prev.map((f) =>
            f.name === file.name ? completedFile : f
          )
        );

        uploadedFiles.push(completedFile);
        onFileUploaded?.(completedFile);
      } catch (error) {
        const errorFile: UploadedFile = {
          name: file.name,
          objectPath: "",
          size: file.size,
          status: "error",
          progress: 0,
          error: error instanceof Error ? error.message : "Upload failed",
        };

        setFiles((prev) =>
          prev.map((f) =>
            f.name === file.name ? errorFile : f
          )
        );

        uploadedFiles.push(errorFile);
      }
    }

    setIsUploading(false);
    onComplete?.(uploadedFiles);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const removeFile = (fileName: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== fileName));
  };

  const clearAll = () => {
    setFiles([]);
  };

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
      />

      <Button
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className={buttonClassName}
      >
        {isUploading ? (
          <>
            <Upload className="h-4 w-4 mr-2 animate-pulse" />
            Uploading...
          </>
        ) : (
          children
        )}
      </Button>

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {files.filter((f) => f.status === "complete").length} of {files.length} uploaded
            </span>
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Clear All
            </Button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
              >
                <ImageIcon className="h-8 w-8 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  {file.status === "uploading" && (
                    <Progress value={file.progress} className="h-1 mt-1" />
                  )}
                  {file.status === "error" && (
                    <p className="text-xs text-red-500">{file.error}</p>
                  )}
                </div>
                {file.status === "complete" && (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                )}
                {file.status === "error" && (
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                )}
                <button
                  onClick={() => removeFile(file.name)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
