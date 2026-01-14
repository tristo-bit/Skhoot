# File Reference Feature (@mentions)

## Overview
You can now reference files in your chat messages using `@filename` syntax. When you send a message with file references, the AI will receive the file content along with your message.

## How to Use

### Method 1: Add from File Explorer
1. Open the File Explorer panel (Files button)
2. Find the file you want to reference
3. Click the three dots (•••) next to the file
4. Select "Add to chat" from the dropdown menu
5. The file reference `@filename` will be inserted into your chat input
6. Type your message and send

### Method 2: Manual Entry
1. Type `@` followed by the filename in the chat input
2. Example: `@config.json what does this configuration do?`
3. Note: The file must have been added via the File Explorer first for the path to be stored

## How It Works

1. **File Selection**: When you click "Add to chat" in the File Explorer, the file path is stored in memory
2. **Message Composition**: The `@filename` reference is added to your chat input
3. **Content Loading**: When you send the message, the system:
   - Detects all `@filename` patterns in your message
   - Reads the file content from the stored paths
   - Appends the file content to your message (hidden from display)
   - Sends the complete message with file content to the AI
4. **AI Processing**: The AI receives your message plus the file contents and can answer questions about the files

## Example Usage

```
User types: @package.json @tsconfig.json explain these configurations

AI receives:
"@package.json @tsconfig.json explain these configurations

--- File: package.json (C:\Users\...\package.json) ---
{
  "name": "my-app",
  "version": "1.0.0",
  ...
}
--- End of package.json ---

--- File: tsconfig.json (C:\Users\...\tsconfig.json) ---
{
  "compilerOptions": {
    ...
  }
}
--- End of tsconfig.json ---"
```

## Features

- ✅ Multiple file references in one message
- ✅ Works with both AI chat and Agent mode
- ✅ File content is automatically loaded from disk
- ✅ Error handling for missing or unreadable files
- ✅ Visual feedback in the File Explorer dropdown
- ✅ Cross-platform support (Windows, macOS, Linux)

## Technical Details

- File paths are stored in `window.__chatFileReferences` Map
- Backend endpoint: `GET /api/v1/files/read?path=<filepath>`
- File content is appended to the message before sending to AI
- Original message (without file content) is displayed in chat history
- File content format: `--- File: filename (path) ---\n<content>\n--- End of filename ---`

## Limitations

- Files must be added via File Explorer first (manual `@filename` won't work without stored path)
- Large files may slow down message processing
- Binary files cannot be read (only text files)
- File content is not cached (read fresh each time)

## Future Enhancements

- [ ] Autocomplete dropdown when typing `@` to select files
- [ ] Visual highlighting of `@mentions` in the textarea
- [ ] File content preview before sending
- [ ] Support for file content caching
- [ ] Drag-and-drop files to add references
- [ ] File size warnings for large files
