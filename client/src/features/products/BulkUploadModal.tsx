import React, { useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/apiClient';
import { Link } from 'react-router-dom';
import { Download, FileSpreadsheet, CheckCircle2, AlertTriangle } from 'lucide-react';

interface RowError {
  row: number;
  message: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

export const BulkUploadModal: React.FC<Props> = ({ isOpen, onClose, onUploaded }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [success, setSuccess] = useState(false);
  const [counts, setCounts] = useState<{ created: number; updated: number; failed: number } | null>(null);
  const [report, setReport] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setMessage(null);
    setErrors([]);
    setSuccess(false);
    setCounts(null);
    setReport(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const downloadTemplate = async () => {
    setIsDownloading(true);
    setMessage(null);
    try {
      const res = await apiClient.get('/products/bulk/template', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'product-upload-template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage('Could not download the template. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;
    const bytes = Uint8Array.from(atob(report), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product-upload-failed-rows.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const upload = async () => {
    if (!file) return;
    setIsUploading(true);
    setMessage(null);
    setErrors([]);
    setSuccess(false);
    setCounts(null);
    setReport(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/products/bulk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = res.data?.data;
      setCounts({ created: data?.created ?? 0, updated: data?.updated ?? 0, failed: data?.failed ?? 0 });
      setErrors(Array.isArray(data?.errors) ? data.errors : []);
      setReport(data?.report || null);
      setSuccess(true);
      setMessage(res.data?.message || 'Done.');
      if ((data?.created ?? 0) + (data?.updated ?? 0) > 0) onUploaded();
    } catch (err: any) {
      const data = err.response?.data;
      setMessage(data?.message || 'Upload failed. Please try again.');
      setErrors(Array.isArray(data?.errors) ? data.errors : []);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Upload Products"
      description="Create many products at once from an Excel file. Images can be added afterwards by editing each product."
      maxWidth="2xl"
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-graphite-200 bg-graphite-50 p-3 text-xs text-graphite-600 space-y-1">
          <p>1. First upload the product photos on the <Link to="/images" onClick={handleClose} className="font-semibold text-brand-700 underline">Product Images</Link> page.</p>
          <p>2. Download the template. One product per row. New products need every column except the images; type image file names (with extension) in Image 1 to Image 5.</p>
          <p>3. A SKU that already exists is <strong>updated</strong> instead (blank cells stay as they are).</p>
          <p>4. Valid rows are saved, new products are published. Rows with problems are skipped and listed in a report you can download, fix and upload again.</p>
        </div>

        <Button type="button" variant="outline" size="sm" onClick={downloadTemplate} isLoading={isDownloading}>
          <Download className="mr-1 h-4 w-4" /> Download Excel Template
        </Button>

        <div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-graphite-300 bg-white px-3 py-3 text-xs font-semibold text-graphite-700 hover:border-brand-400">
            <FileSpreadsheet className="h-4 w-4 text-brand-700" />
            {file ? file.name : 'Choose completed .xlsx file'}
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setMessage(null);
                setErrors([]);
                setSuccess(false);
              }}
            />
          </label>
        </div>

        {message && (
          <div
            className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${
              success && (counts?.failed ?? 0) === 0
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : success
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {success && (counts?.failed ?? 0) === 0 ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />}
            <span>{message}</span>
          </div>
        )}

        {report && (
          <Button type="button" variant="outline" size="sm" onClick={downloadReport}>
            <Download className="mr-1 h-4 w-4" /> Download failed rows report (Excel)
          </Button>
        )}

        {errors.length > 0 && (
          <div className="max-h-56 overflow-y-auto rounded-lg border border-graphite-200">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-graphite-50 text-graphite-500">
                <tr>
                  <th className="w-16 px-3 py-2 font-semibold">Row</th>
                  <th className="px-3 py-2 font-semibold">Problem</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((e) => (
                  <tr key={e.row} className="border-t border-graphite-100 align-top">
                    <td className="px-3 py-2 font-mono text-graphite-700">{e.row}</td>
                    <td className="px-3 py-2 text-red-700">{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-graphite-200 pt-3">
          <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={isUploading}>
            {success ? 'Close' : 'Cancel'}
          </Button>
          {!success && (
            <Button type="button" size="sm" onClick={upload} isLoading={isUploading} disabled={!file}>
              Upload &amp; Import
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
