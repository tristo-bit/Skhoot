import { FileInfo } from '../types';

export interface FileTag {
  id: string;
  name: string;
  color: string;
  category: 'auto' | 'manual';
}

export interface TaggedFile extends FileInfo {
  tags: FileTag[];
}

export const PREDEFINED_TAGS: FileTag[] = [
  { id: 'work', name: 'Work', color: '#3B82F6', category: 'auto' },
  { id: 'personal', name: 'Personal', color: '#10B981', category: 'auto' },
  { id: 'temp', name: 'Temporary', color: '#F59E0B', category: 'auto' },
  { id: 'archive', name: 'Archive', color: '#6B7280', category: 'auto' },
  { id: 'important', name: 'Important', color: '#EF4444', category: 'manual' }
];

export class SmartTagger {
  private rules = new Map([
    [/\.(tmp|temp|cache)$/i, ['temp']],
    [/invoice|receipt|tax/i, ['work', 'important']],
    [/family|vacation|personal/i, ['personal']],
    [/backup|archive|old/i, ['archive']],
    [/node_modules|\.git/i, ['temp']]
  ]);

  autoTag(file: FileInfo): FileTag[] {
    const tags: FileTag[] = [];
    
    for (const [pattern, tagIds] of this.rules) {
      if (pattern.test(file.name) || pattern.test(file.path)) {
        tagIds.forEach(tagId => {
          const tag = PREDEFINED_TAGS.find(t => t.id === tagId);
          if (tag && !tags.find(t => t.id === tag.id)) {
            tags.push(tag);
          }
        });
      }
    }

    return tags;
  }

  tagFiles(files: FileInfo[]): TaggedFile[] {
    return files.map(file => ({
      ...file,
      tags: this.autoTag(file)
    }));
  }
}