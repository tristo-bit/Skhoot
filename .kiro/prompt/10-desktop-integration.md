# Prompt 10: Deep Native Desktop Integration

"Implement system-level integrations that bridge the gap between the webview and the host OS.

Key Integrations:
1. Native File Picker: Use `tauri-plugin-dialog` to provide a real file explorer for attachments, ensuring multiple file selection works on Linux where standard browser inputs are limited.
2. Permission Escalation: On Linux, implement a command using `pkexec` (PolicyKit) to help users add themselves to the `audio` group for microphone access via a native auth dialog.
3. System Notifications: Integrate `tauri-plugin-notification` to alert users when long-running agent tasks or background workflows are completed.
4. Auto-Startup Health Check: Implement a sequence that verifies the Axum sidecar is alive before allowing user input, showing a non-blocking 'Waiting for backend...' status if needed."
