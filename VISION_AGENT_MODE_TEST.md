# Vision/OCR Agent Mode - Testing Guide

## ✅ Implementation Complete

Vision and OCR now work in **both Normal Mode and Agent Mode**!

## Quick Test (30 seconds)

### 1. Enable Agent Mode
- Click the CPU icon in the chat interface
- Or press `Ctrl+Shift+A`
- Verify "Agent Mode" indicator is active

### 2. Attach an Image
- Click the "+" button to attach files
- Select an image with text (screenshot, document, photo with signs)
- Supported formats: JPG, PNG, GIF, BMP, WebP

### 3. Ask About the Image
Try these prompts:
- "What do you see in this image?"
- "Read the text in this image"
- "Describe what's in this screenshot"
- "What objects are visible in this photo?"

### 4. Verify Success
✅ AI should analyze the image and respond with details
✅ Status should show "Analyzing 1 image(s) with [provider]..."
✅ No "I cannot process images" error
✅ Response includes actual image content

## Advanced Tests

### Test 1: OCR (Text Extraction)
1. Attach a screenshot with code or text
2. Ask: "Extract all the text from this image"
3. Verify: AI reads and returns the text accurately

### Test 2: Tool Calling + Vision
1. Attach an image with code
2. Ask: "Analyze this code screenshot and save your review to review.txt"
3. Verify: AI analyzes image AND uses `write_file` tool
4. Check: review.txt file is created with analysis

### Test 3: Multiple Images
1. Attach 2-3 different images
2. Ask: "Compare these images and describe the differences"
3. Verify: AI analyzes all images and provides comparison

### Test 4: Conversation History
1. Attach an image and ask about it
2. In next message (without image): "What was in that image again?"
3. Verify: AI remembers the image from history

### Test 5: Message Editing
1. Send a message with an image
2. Edit the message text (keep the image)
3. Verify: AI re-analyzes with new text and same image

### Test 6: Different Providers
Test with each provider:
- **OpenAI**: gpt-4o, gpt-4o-mini
- **Google**: gemini-2.0-flash, gemini-1.5-pro
- **Anthropic**: claude-3-5-sonnet

## Expected Behavior

### ✅ What Should Work
- Image attachment in Agent Mode
- Vision analysis with tool calling
- OCR text extraction
- Multi-image support
- Image persistence in history
- Status updates during analysis
- All supported providers

### ❌ What Should NOT Happen
- "I cannot process images" error
- Images being ignored
- Empty responses
- Tool calling breaking vision
- Images lost in history

## Debugging

### Check Browser Console
Open DevTools (F12) and look for:

**Success indicators:**
```
[AgentChatService] Adding images to message: 1 images
[AgentChatService] Analyzing 1 image(s) with openai...
```

**Image loading:**
```
[ChatInterface] Loading image: screenshot.png
[ChatInterface] ✅ Successfully loaded image file
[ChatInterface] Base64 length: 45231 chars
```

**Vision support:**
```
[AgentChatService] Vision support check: { supportsVision: true }
```

### Common Issues

**Issue**: "I cannot process images"
- **Check**: Is the model vision-capable? (gpt-4o, gemini-2.0-flash, claude-3-5-sonnet)
- **Check**: Are images actually being loaded? (check console logs)
- **Check**: Is Agent Mode enabled?

**Issue**: Images not loading
- **Check**: Is backend running on port 3001?
- **Check**: File path correct?
- **Check**: Image format supported?

**Issue**: No vision analysis
- **Check**: Model supports vision (see list above)
- **Check**: API key is valid
- **Check**: Console shows "Adding images to message"

## Example Prompts

### OCR Examples
- "Read all the text from this screenshot"
- "Extract the code from this image"
- "What does the sign in this photo say?"
- "Transcribe the document in this image"

### Analysis Examples
- "Describe what's happening in this image"
- "What objects can you identify?"
- "Analyze the UI design in this screenshot"
- "What errors are shown in this screenshot?"

### Tool Calling + Vision Examples
- "Analyze this code screenshot and create a similar file"
- "Read this invoice and save the data to invoice.json"
- "Describe this diagram and create documentation"
- "Extract text from this image and search for similar content in my files"

## Success Criteria

✅ **Agent Mode + Vision Working** when:
1. Images load successfully (check console)
2. AI analyzes image content (not generic response)
3. OCR extracts text accurately
4. Tool calling works alongside vision
5. Images persist in conversation
6. All providers work (OpenAI, Google, Anthropic)
7. No "I cannot process images" errors

## Performance Notes

- **Image size**: Larger images take longer to process
- **Multiple images**: Processing time increases with count
- **OCR accuracy**: Higher with `detail: 'high'` (OpenAI)
- **Provider speed**: Varies by provider and model

## Supported Image Formats

✅ JPEG (`.jpg`, `.jpeg`)
✅ PNG (`.png`)
✅ GIF (`.gif`)
✅ BMP (`.bmp`)
✅ WebP (`.webp`)

## Supported Models

### OpenAI
- ✅ gpt-4o
- ✅ gpt-4o-mini
- ✅ gpt-4-turbo
- ✅ gpt-4-vision-preview

### Google
- ✅ gemini-2.0-flash
- ✅ gemini-1.5-pro
- ✅ gemini-1.5-flash

### Anthropic
- ✅ claude-3-5-sonnet-20241022
- ✅ claude-3-opus-20240229
- ✅ claude-3-haiku-20240307

## Next Steps

After successful testing:
1. ✅ Vision/OCR works in both modes
2. ✅ Tool calling + vision combination works
3. ✅ All providers supported
4. ✅ Images persist in history
5. ✅ Ready for production use

## Troubleshooting

If tests fail:
1. Check browser console for errors
2. Verify backend is running
3. Confirm API keys are valid
4. Test with different image
5. Try different provider/model
6. Check VISION_OCR_ANALYSIS.md for details

## Report Issues

If you find bugs:
1. Note which test failed
2. Copy console logs
3. Note provider and model used
4. Include image type/size
5. Describe expected vs actual behavior
