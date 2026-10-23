import React, { useState, useEffect, useCallback } from 'react';

type DownloadItem = {
  id: string;
  url: string;
  filePath: string | null;
  totalBytes: number;
  receivedBytes: number;
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
  startedAt: number;
  completedAt: number | null;
};

export default function DownloadsPanel({
  downloads,
  onCancel,
  onRemove,
  onClearCompleted,
  setDownloadPath,
  currentDownloadPath,
  onClose,
}: {
  downloads: DownloadItem[];
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
  onClearCompleted: () => void;
  setDownloadPath: (p: string) => void;
  currentDownloadPath: string;
  onClose: () => void;
}) {
  const [newPath, setNewPath] = useState(currentDownloadPath);

  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }, []);

  const progress = (item: DownloadItem): number => {
    if (item.totalBytes <= 0) return 0;
    return Math.round((item.receivedBytes / item.totalBytes) * 100);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-end p-4 pointer-events-none">
      <div className="pointer-events-auto orb-elevated orb-strong rounded-xl border orb-border shadow-[0_20px_40px_rgba(41,37,36,0.2)] w-full max-w-md p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="orb-text-strong text-sm font-medium">Downloads</div>
          <button
            onClick={onClose}
            className="orb-control h-6 w-6 flex items-center justify-center rounded-md"
          >
            <span className="text-[10px]">✕</span>
          </button>
        </div>

        {/* Download path setting */}
        <div className="border-t orb-border pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="orb-muted text-xs">Download location</div>
            <button
              onClick={onClearCompleted}
              className="orb-control h-6 px-2 py-1 text-[10px] rounded-md"
            >
              Clear completed
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              className="orb-input flex-1 text-[10px]"
              placeholder="Downloads folder"
            />
            <button
              onClick={() => void setDownloadPath(newPath)}
              className="orb-control px-2 py-1 text-[10px] rounded-md"
            >
              Set
            </button>
          </div>
          <div className="orb-muted text-[9px]">{currentDownloadPath}</div>
        </div>

        <div className="max-h-[300px] overflow-y-auto space-y-2">
          {downloads.length === 0 ? (
            <div className="text-center py-4">
              <div className="orb-muted text-xs">No downloads</div>
            </div>
          ) : (
            downloads.map((item) => (
              <div key={item.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="orb-text-strong text-xs truncate max-w-[140px]">
                      {item.url.length > 60 ? item.url.slice(0, 60) + '…' : item.url}
                    </span>
                  </div>
                  <span className="orb-muted text-[10px]">
                    {item.state === 'completed' ? 'Done' : item.state === 'progressing' ? progress(item) + '%' : item.state}
                  </span>
                </div>
                <div className="w-full bg-[var(--orb-border)] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-[var(--orb-accent)] transition-all duration-300"
                    style={{ width: `${progress(item)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="orb-muted text-[10px]">
                    {item.filePath ? item.filePath.split('/').pop() || item.filePath : ''}
                  </span>
                  <div className="flex gap-1">
                    {item.state === 'progressing' && (
                      <button
                        onClick={() => onCancel(item.id)}
                        className="orb-control h-6 w-6 flex items-center justify-center rounded-md"
                        title="Cancel"
                      >
                        <span className="text-[9px]">✕</span>
                      </button>
                    )}
                    {item.state !== 'progressing' && (
                      <button
                        onClick={() => onRemove(item.id)}
                        className="orb-control h-6 w-6 flex items-center justify-center rounded-md"
                        title="Remove"
                      >
                        <span className="text-[9px]">🗑</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
