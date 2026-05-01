"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ExcelUploadDropzoneProps {
  onUploadSuccess: (data: {
    batchId: string;
    total: number;
    duplicates: number;
    format: string;
  }) => void;
}

export function ExcelUploadDropzone({ onUploadSuccess }: ExcelUploadDropzoneProps) {
  const t = useTranslations("imports");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
        setError(t("fileTooLarge"));
        return;
      }

      setUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/imports/excel-upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || t("uploadFailed"));
        }

        const data = await response.json();
        toast.success(t("uploadSuccess", { count: data.total }));
        onUploadSuccess(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : t("uploadFailed");
        setError(message);
        toast.error(message);
      } finally {
        setUploading(false);
      }
    },
    [onUploadSuccess, t],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div className="space-y-4">
      <Card
        {...getRootProps()}
        className={`cursor-pointer border-2 border-dashed transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : uploading
              ? "cursor-not-allowed border-muted bg-muted/20"
              : "border-border hover:border-primary/50 hover:bg-accent/5"
        }`}
      >
        <CardContent className="flex min-h-[240px] flex-col items-center justify-center p-8 text-center">
          <input {...getInputProps()} />

          {uploading ? (
            <>
              <div className="mb-4 h-16 w-16 animate-pulse rounded-full bg-primary/20" />
              <p className="text-lg font-medium">{t("uploading")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("processing")}</p>
            </>
          ) : (
            <>
              <div className="mb-4 rounded-full bg-primary/10 p-4">
                {isDragActive ? (
                  <Upload className="h-8 w-8 text-primary" />
                ) : (
                  <FileSpreadsheet className="h-8 w-8 text-primary" />
                )}
              </div>

              <h3 className="text-lg font-semibold">
                {isDragActive ? t("dropHere") : t("uploadTitle")}
              </h3>

              <p className="mt-2 text-sm text-muted-foreground">{t("uploadDescription")}</p>

              <Button type="button" variant="outline" className="mt-6" disabled={uploading}>
                {t("selectFile")}
              </Button>

              <p className="mt-4 text-xs text-muted-foreground">{t("supportedFormats")}</p>
            </>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
