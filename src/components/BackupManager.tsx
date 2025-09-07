"use client";

import { useRef, useState } from "react";
import { downloadBackup, importData } from "@/lib/storage";

interface BackupManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export default function BackupManager({
  isOpen,
  onClose,
  onImportComplete,
}: BackupManagerProps) {
  const [importStatus, setImportStatus] = useState<{
    status: "idle" | "success" | "error";
    message?: string;
  }>({ status: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    try {
      downloadBackup();
      setImportStatus({
        status: "success",
        message: "Backup downloaded successfully!",
      });
    } catch (error) {
      setImportStatus({
        status: "error",
        message: error instanceof Error ? error.message : "Export failed",
      });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = importData(text);

      if (result.success) {
        setImportStatus({
          status: "success",
          message: "Data imported successfully!",
        });
        // Reload the page after a short delay to refresh all data
        setTimeout(() => {
          onImportComplete();
          window.location.reload();
        }, 1500);
      } else {
        setImportStatus({
          status: "error",
          message: result.error || "Import failed",
        });
      }
    } catch (error) {
      setImportStatus({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to read file",
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleEscapeKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onKeyDown={handleEscapeKey}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="backup-title"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2
              id="backup-title"
              className="text-2xl font-bold text-gray-900 dark:text-white"
            >
              Backup & Restore
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            {/* Export Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Export Data
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Download your progress as a JSON file that can be imported on
                another device.
              </p>
              <button
                type="button"
                onClick={handleExport}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                📥 Download Backup
              </button>
            </div>

            {/* Import Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Import Data
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Upload a backup file to restore your progress. This will replace
                all current data.
              </p>
              <button
                type="button"
                onClick={handleImportClick}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                📤 Upload Backup
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Status Messages */}
            {importStatus.status !== "idle" && (
              <div
                className={`p-4 rounded-lg ${
                  importStatus.status === "success"
                    ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                }`}
              >
                <p
                  className={`text-sm ${
                    importStatus.status === "success"
                      ? "text-green-700 dark:text-green-200"
                      : "text-red-700 dark:text-red-200"
                  }`}
                >
                  {importStatus.message}
                </p>
                {importStatus.status === "success" && (
                  <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                    Page will reload automatically...
                  </p>
                )}
              </div>
            )}

            {/* Warning */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <title>Warning</title>
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Important Note
                  </h4>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    Importing data will completely replace your current
                    progress. Make sure to export your current data first if you
                    want to keep it.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
