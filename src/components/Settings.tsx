"use client";

import { useEffect, useRef, useState } from "react";
import { downloadBackup, importData } from "@/lib/storage";
import type { AppSettings } from "@/lib/types";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  onDeckRegenerate: (settings: AppSettings) => void;
}

export default function Settings({
  isOpen,
  onClose,
  onImportComplete,
  settings,
  onSettingsChange,
  onDeckRegenerate,
}: SettingsProps) {
  const [importStatus, setImportStatus] = useState<{
    status: "idle" | "success" | "error";
    message?: string;
  }>({ status: "idle" });
  const [deckStatus, setDeckStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setDeckStatus(null);
      setImportStatus({ status: "idle" });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [isOpen]);

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

  const handleSoundToggle = () => {
    const newSettings = { ...settings, soundEnabled: !settings.soundEnabled };
    onSettingsChange(newSettings);
  };

  const handleWarmupTargetChange = (value: number) => {
    const newSettings = { ...settings, warmupTarget: value };
    onSettingsChange(newSettings);
  };

  const handleShowUpcomingReviewsToggle = () => {
    const newSettings = {
      ...settings,
      showUpcomingReviews: !settings.showUpcomingReviews,
    };
    onSettingsChange(newSettings);
  };

  const markDeckNeedsRegeneration = () => {
    setDeckStatus("Update deck to apply new settings.");
  };

  const handleOperationModeChange = (mode: AppSettings["operationMode"]) => {
    if (mode === settings.operationMode) return;
    const newSettings = { ...settings, operationMode: mode };
    onSettingsChange(newSettings);
    markDeckNeedsRegeneration();
  };

  const handleMinNumberChange = (rawValue: string) => {
    const parsed = Number.parseInt(rawValue, 10);
    if (Number.isNaN(parsed)) return;
    const safeMin = Math.max(0, parsed);
    const safeMax = Math.max(safeMin, settings.maxNumber);
    const newSettings = {
      ...settings,
      minNumber: safeMin,
      maxNumber: safeMax,
    };
    onSettingsChange(newSettings);
    markDeckNeedsRegeneration();
  };

  const handleMaxNumberChange = (rawValue: string) => {
    const parsed = Number.parseInt(rawValue, 10);
    if (Number.isNaN(parsed)) return;
    const safeMax = Math.max(settings.minNumber, Math.floor(parsed));
    const newSettings = {
      ...settings,
      maxNumber: safeMax,
    };
    onSettingsChange(newSettings);
    markDeckNeedsRegeneration();
  };

  const handleNonNegativeToggle = () => {
    const newSettings = {
      ...settings,
      nonNegativeSubtraction: !settings.nonNegativeSubtraction,
    };
    onSettingsChange(newSettings);
    markDeckNeedsRegeneration();
  };

  const handleRegenerateDeck = (message?: string) => {
    onDeckRegenerate({ ...settings });
    setDeckStatus(message ?? "Deck regenerated with current settings.");
  };

  const gradePresets: Array<{
    label: string;
    description: string;
    settings: Pick<
      AppSettings,
      "operationMode" | "minNumber" | "maxNumber" | "nonNegativeSubtraction"
    >;
  }> = [
    {
      label: "Grade 1",
      description: "0–10, addition focus",
      settings: {
        operationMode: "addition",
        minNumber: 0,
        maxNumber: 10,
        nonNegativeSubtraction: true,
      },
    },
    {
      label: "Grade 2",
      description: "0–20, mixed, non-negative",
      settings: {
        operationMode: "mixed",
        minNumber: 0,
        maxNumber: 20,
        nonNegativeSubtraction: true,
      },
    },
    {
      label: "Grade 3",
      description: "0–50, mixed, non-negative",
      settings: {
        operationMode: "mixed",
        minNumber: 0,
        maxNumber: 50,
        nonNegativeSubtraction: true,
      },
    },
  ];

  const applyPreset = (presetIndex: number) => {
    const preset = gradePresets[presetIndex];
    const updatedSettings = {
      ...settings,
      ...preset.settings,
    };
    onSettingsChange(updatedSettings);
    onDeckRegenerate(updatedSettings);
    setDeckStatus(`${preset.label} preset applied and deck regenerated.`);
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
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onKeyDown={handleEscapeKey}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2
              id="settings-title"
              className="text-2xl font-bold text-gray-900 dark:text-white"
            >
              Settings
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
            {/* Deck Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Deck Settings
              </h3>
              <div className="space-y-5">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Choose which operations to study.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "addition", label: "Addition" },
                      { value: "subtraction", label: "Subtraction" },
                      { value: "mixed", label: "Mixed" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          handleOperationModeChange(
                            option.value as AppSettings["operationMode"],
                          )
                        }
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          settings.operationMode === option.value
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600"
                        }`}
                        aria-pressed={settings.operationMode === option.value}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="min-number"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Minimum Number
                    </label>
                    <input
                      id="min-number"
                      type="number"
                      min={0}
                      max={99}
                      value={settings.minNumber}
                      onChange={(e) => handleMinNumberChange(e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="max-number"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Maximum Number
                    </label>
                    <input
                      id="max-number"
                      type="number"
                      min={settings.minNumber}
                      max={199}
                      value={settings.maxNumber}
                      onChange={(e) => handleMaxNumberChange(e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label
                      htmlFor="non-negative-toggle"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Prevent Negative Subtraction Results
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      When enabled, subtraction cards always result in ≥ 0.
                    </p>
                  </div>
                  <button
                    id="non-negative-toggle"
                    type="button"
                    onClick={handleNonNegativeToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      settings.nonNegativeSubtraction
                        ? "bg-blue-600"
                        : "bg-gray-200 dark:bg-gray-600"
                    }`}
                    aria-pressed={settings.nonNegativeSubtraction}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.nonNegativeSubtraction
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Grade Presets
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {gradePresets.map((preset, index) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => applyPreset(index)}
                        className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
                      >
                        <div className="font-semibold">{preset.label}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {preset.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {deckStatus && (
                  <div className="rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 text-xs text-blue-700 dark:text-blue-200">
                    {deckStatus}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRegenerateDeck()}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  >
                    Regenerate Deck
                  </button>
                </div>
              </div>
            </div>

            {/* Sound Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Audio Settings
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <label
                    htmlFor="sound-toggle"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Celebration Sound Effects
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Play sound when you answer correctly
                  </p>
                </div>
                <button
                  id="sound-toggle"
                  type="button"
                  onClick={handleSoundToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    settings.soundEnabled
                      ? "bg-blue-600"
                      : "bg-gray-200 dark:bg-gray-600"
                  }`}
                  aria-pressed={settings.soundEnabled}
                  aria-describedby="sound-toggle-description"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.soundEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Practice Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Practice Settings
              </h3>
              <div>
                <label
                  htmlFor="warmup-target"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Warmup Target (responses needed before speed grading)
                </label>
                <select
                  id="warmup-target"
                  value={settings.warmupTarget}
                  onChange={(e) =>
                    handleWarmupTargetChange(Number(e.target.value))
                  }
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value={25}>25 responses</option>
                  <option value={50}>50 responses (recommended)</option>
                  <option value={75}>75 responses</option>
                  <option value={100}>100 responses</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  During warmup, all correct answers receive "Good" rating
                </p>
              </div>

              {/* Show Upcoming Reviews Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label
                    htmlFor="upcoming-reviews-toggle"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Show Upcoming Reviews
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Display the 7-day review forecast at the top of the practice
                    screen
                  </p>
                </div>
                <button
                  id="upcoming-reviews-toggle"
                  type="button"
                  onClick={handleShowUpcomingReviewsToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    settings.showUpcomingReviews
                      ? "bg-blue-600"
                      : "bg-gray-200 dark:bg-gray-600"
                  }`}
                  aria-pressed={settings.showUpcomingReviews}
                  aria-describedby="upcoming-reviews-toggle-description"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.showUpcomingReviews
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Backup & Restore */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Backup & Restore
              </h3>

              {/* Export Section */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
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
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Upload a backup file to restore your progress. This will
                  replace all current data.
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
                  className={`p-4 rounded-lg mt-4 ${
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
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mt-4">
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
                      progress. Make sure to export your current data first if
                      you want to keep it.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
