import { FileInfo } from '../types';

export interface OrganizationRule {
  id: string;
  name: string;
  pattern: RegExp;
  targetFolder: string;
  enabled: boolean;
}

export interface OrganizationSuggestion {
  id: string;
  file: FileInfo;
  suggestedPath: string;
  reason: string;
  confidence: number;
}

export const DEFAULT_RULES: OrganizationRule[] = [
  {
    id: 'images',
    name: 'Images',
    pattern: /\.(jpg|jpeg|png|gif|webp|svg)$/i,
    targetFolder: '/Pictures/Organized',
    enabled: true
  },
  {
    id: 'documents',
    name: 'Documents',
    pattern: /\.(pdf|doc|docx|txt|md)$/i,
    targetFolder: '/Documents/Organized',
    enabled: true
  },
  {
    id: 'archives',
    name: 'Archives',
    pattern: /\.(zip|rar|7z|tar|gz)$/i,
    targetFolder: '/Downloads/Archives',
    enabled: true
  }
];

export class FileOrganizer {
  private rules: OrganizationRule[] = DEFAULT_RULES;

  analyzeFolderStructure(files: FileInfo[]): OrganizationSuggestion[] {
    return files
      .map(file => this.getSuggestion(file))
      .filter(Boolean) as OrganizationSuggestion[];
  }

  private getSuggestion(file: FileInfo): OrganizationSuggestion | null {
    const rule = this.rules.find(r => r.enabled && r.pattern.test(file.name));
    if (!rule) return null;

    return {
      id: `org_${file.id}`,
      file,
      suggestedPath: `${rule.targetFolder}/${file.name}`,
      reason: `Matches ${rule.name} pattern`,
      confidence: 0.85
    };
  }
}