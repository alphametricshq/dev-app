' Roda 'npm run dev' invisivel, output para server.log
' Usa dev em vez de start porque o projeto tem output: standalone (next start nao funciona).
' O empacotamento Electron usa node .next/standalone/server.js diretamente.
' Chamado pelo start-dashboard.bat — nao executar diretamente.
Set WshShell = CreateObject("WScript.Shell")
strPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strPath
WshShell.Run "cmd /c npm run dev > """ & strPath & "\server.log"" 2>&1", 0, False
