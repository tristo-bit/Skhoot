import React, { useState } from 'react';
import { Copy, Trash2, Eye, AlertTriangle } from 'lucide-react';
import { COLORS, GLASS_STYLES } from '../src/constants';
import { FileInfo } from '../types';

interface DuplicateGroup {
  id: string;
  files: FileInfo[];
  totalSize: string;
  similarity: number;
}

const MOCK_DUPLICATES: DuplicateGroup[] = [
  {
    id: 'dup1',
    files: [
      { id: 'd1', name: 'presentation.pptx', path: '/Desktop', size: '45 MB', category: 'Work', safeToRemove: true, lastUsed: '2024-01-08' },
      { id: 'd2', name: 'presentation_copy.pptx', path: '/Documents', size: '45 MB', category: 'Work', safeToRemove: true, lastUsed: '2024-01-05' }
    ],
    totalSize: '90 MB',
    similarity: 100
  }
];

export const DuplicateDetector: React.FC = () => {
  const [duplicates] = useState<DuplicateGroup[]>(MOCK_DUPLICATES);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Copy className="w-5 h-5" style={{ color: COLORS.textPrimary }} />
        <h3 className="text-lg font-medium" style={{ color: COLORS.textPrimary }}>
          Duplicate Files
        </h3>
      </div>

      {duplicates.map((group) => (
        <div
          key={group.id}
          className="rounded-lg p-4"
          style={{
            backgroundColor: COLORS.cloudDancer,
            ...GLASS_STYLES.subtle
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: COLORS.textSecondary }} />
              <span className="text-sm font-medium" style={{ color: COLORS.textPrimary }}>
                {group.similarity}% similar • {group.totalSize} wasted
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {group.files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                style={{ backgroundColor: COLORS.lemonIcing }}
                onClick={() => toggleFileSelection(file.id)}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.id)}
                    onChange={() => toggleFileSelection(file.id)}
                    className="rounded"
                  />
                  <div>
                    <div className="font-medium text-sm" style={{ color: COLORS.textPrimary }}>
                      {file.name}
                    </div>
                    <div className="text-xs" style={{ color: COLORS.textSecondary }}>
                      {file.path} • {file.size}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-1 rounded hover:bg-black/5">
                    <Eye className="w-4 h-4" style={{ color: COLORS.textSecondary }} />
                  </button>
                  <button className="p-1 rounded hover:bg-black/5">
                    <Trash2 className="w-4 h-4" style={{ color: COLORS.textSecondary }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};