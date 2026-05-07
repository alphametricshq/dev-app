' Dashboard Pessoal — Inicializador silencioso
' Roda npm run start invisivel em background e abre o app no Edge
Option Explicit

Dim WshShell, fso, strPath, edgePath, alreadyRunning, exec

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strPath = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strPath

' Checa se a porta 3000 ja esta sendo ouvida
Set exec = WshShell.Exec("cmd /c netstat -ano | findstr "":3000 " & Chr(34) & " | findstr LISTENING")
Do While exec.Status = 0 : WScript.Sleep 50 : Loop
alreadyRunning = (exec.ExitCode = 0)

If Not alreadyRunning Then
    ' Sobe o servidor invisivel via _start-server.vbs
    WshShell.Run "wscript """ & strPath & "\_start-server.vbs""", 0, False

    ' Aguarda ate 30s a porta 3000 ficar LISTENING
    Dim i
    For i = 1 To 30
        WScript.Sleep 1000
        Set exec = WshShell.Exec("cmd /c netstat -ano | findstr "":3000 " & Chr(34) & " | findstr LISTENING")
        Do While exec.Status = 0 : WScript.Sleep 50 : Loop
        If exec.ExitCode = 0 Then Exit For
    Next

    ' Margem extra para o Next finalizar
    WScript.Sleep 1000
End If

' Abre o app no Edge (modo --app, sem barra do navegador)
edgePath = WshShell.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\Microsoft\Edge\Application\msedge.exe"
WshShell.Run """" & edgePath & """ --app=http://localhost:3000", 1, False
