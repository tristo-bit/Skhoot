# Script to update ChatInterface.tsx with currentToolName tracking

$filePath = "components/chat/ChatInterface.tsx"
$content = Get-Content $filePath -Raw

# Replace pattern 1: Add setCurrentToolName after toolCalls.push
$pattern1 = '(toolCalls\.push\(toolCall as AgentToolCallData\);)\s+(setSearchStatus\(`Executing)'
$replacement1 = '$1' + "`n" + '              setCurrentToolName(toolCall.name); // Track current tool' + "`n" + '              $2'
$content = $content -replace $pattern1, $replacement1

# Replace pattern 2: Add setCurrentToolName(null) after toolResults.push
$pattern2 = '(toolResults\.push\(resultWithSignature\);)\s+(setSearchStatus\(result\.success)'
$replacement2 = '$1' + "`n" + '              setCurrentToolName(null); // Clear current tool' + "`n" + '              $2'
$content = $content -replace $pattern2, $replacement2

# Save the file
$content | Set-Content $filePath -NoNewline

Write-Host "ChatInterface.tsx updated successfully!"
