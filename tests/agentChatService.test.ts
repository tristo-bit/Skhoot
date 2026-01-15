import { describe, it, expect } from 'vitest';

describe('AgentChatService', () => {
  it('should detect file references in messages', () => {
    const message = 'Check @config.json and @package.json';
    const hasFileRef = message.includes('@');
    expect(hasFileRef).toBe(true);
  });

  it('should handle messages without file references', () => {
    const message = 'List all files in the directory';
    const fileRefs = message.match(/@[\w.-]+/g);
    expect(fileRefs).toBeNull();
  });

  it('should extract multiple file references', () => {
    const message = 'Compare @file1.ts and @file2.ts';
    const fileRefs = message.match(/@[\w.-]+/g);
    expect(fileRefs).toHaveLength(2);
    expect(fileRefs).toContain('@file1.ts');
    expect(fileRefs).toContain('@file2.ts');
  });
});
