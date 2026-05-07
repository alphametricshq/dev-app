' Roda 'npm run start' invisivel, output para server.log
' Chamado pelo start-dashboard.bat — nao executar diretamente.
Set WshShell = CreateObject("WScript.Shell")
strPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strPath
WshShell.Run "cmd /c npm run start > """ & strPath & "\server.log"" 2>&1", 0, False
