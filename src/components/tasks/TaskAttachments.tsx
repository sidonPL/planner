"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, File, Image as ImageIcon, FileText, Download, Trash2, Paperclip } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

type Attachment = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
  uploader: {
    id: string;
    name: string | null;
    avatar: string | null;
    color: string;
  };
};

interface TaskAttachmentsProps {
  taskId: string;
  currentUserId: string;
}

export function TaskAttachments({ taskId, currentUserId }: TaskAttachmentsProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const loadAttachments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/attachments`);
      if (response.ok) {
        const data = await response.json();
        setAttachments(data);
      }
    } catch (error) {
      console.error("Error loading attachments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Walidacja rozmiaru (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Plik jest za duży (max 10MB)");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Symulacja progressu (prawdziwy progress wymaga XMLHttpRequest)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        const newAttachment = await response.json();
        setAttachments([newAttachment, ...attachments]);
        toast.success("Dodano załącznik");
      } else {
        const error = await response.json();
        toast.error(error.error || "Nie udało się dodać załącznika");
      }
    } catch (error) {
      console.error("Error uploading attachment:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć ten załącznik?")) {
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}/attachments/${attachmentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setAttachments(attachments.filter((a) => a.id !== attachmentId));
        toast.success("Usunięto załącznik");
      } else {
        toast.error("Nie udało się usunąć załącznika");
      }
    } catch (error) {
      console.error("Error deleting attachment:", error);
      toast.error("Wystąpił błąd");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <ImageIcon className="h-5 w-5" />;
    if (mimeType.includes("pdf")) return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Dziś";
    if (days === 1) return "Wczoraj";
    if (days < 7) return `${days} dni temu`;
    return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Ładowanie załączników...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload button */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? "Uploading..." : "Dodaj załącznik"}
        </Button>
      </div>

      {/* Upload progress */}
      {isUploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">{uploadProgress}%</p>
        </div>
      )}

      {/* Lista załączników */}
      {attachments.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <Paperclip className="h-12 w-12 mx-auto mb-2 opacity-20" />
          <p>Brak załączników</p>
          <p className="text-xs mt-1">Dodaj pliki (max 10MB)</p>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const canDelete = attachment.uploader.id === currentUserId;
            const isImage = attachment.mimeType.startsWith("image/");

            return (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                {/* Icon/Preview */}
                <div className="flex-shrink-0">
                  {isImage ? (
                    <div className="h-10 w-10 rounded overflow-hidden bg-muted relative">
                      <Image
                        src={attachment.fileUrl}
                        alt={attachment.fileName}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-muted-foreground">
                      {getFileIcon(attachment.mimeType)}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{attachment.fileName}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(attachment.fileSize)}</span>
                    <span>•</span>
                    <span>{formatDate(attachment.createdAt)}</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={attachment.uploader.avatar || undefined} />
                        <AvatarFallback
                          style={{ backgroundColor: attachment.uploader.color }}
                          className="text-white text-[8px]"
                        >
                          {attachment.uploader.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{attachment.uploader.name}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    asChild
                  >
                    <a href={attachment.fileUrl} download target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(attachment.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Obsługiwane: obrazy, dokumenty, PDF (max 10MB)
      </p>
    </div>
  );
}

