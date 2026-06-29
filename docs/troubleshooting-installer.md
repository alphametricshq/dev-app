# Troubleshooting do Instalador NSIS

## Quando o instalador do Alphametrics Dev App crashar

O Flix relatou que o instalador NSIS crashava no meio do install em
v0.12.4. A partir da **v0.12.5**, o instalador grava logs verbosos
pra a gente conseguir diagnosticar.

## Como pegar os logs

Após uma tentativa de install (mesmo que tenha crashado), peça pro user:

1. Abrir o Explorer
2. Colar na barra de endereço: `%TEMP%`
3. Procurar e mandar **3 arquivos**:
   - `nsis_alphametrics_install.log` — log estruturado dos macros customizados
   - `nsis*.log` — log padrão do NSIS (nome varia por versão Windows)
   - `Setup Log <DATA> #001.txt` — se existir, log do bootstrapper Squirrel-like

Também útil:

4. Ir em `%LOCALAPPDATA%\Alphametrics Dev App\logs\main.log` (se a instalação
   chegou até a primeira execução do app) — manda os últimos 100 lines.

## Hipóteses prováveis do crash (ordem de probabilidade)

1. **Antivírus quarentenando o unpacker** (Defender, Avast, Kaspersky)
   - Sintoma esperado no log: `app-builder-bin` ou `app-7zip` com erro de I/O
   - Fix: assinar o exe (mesmo self-signed) ou pedir pro user adicionar exceção temporária no AV durante a instalação

2. **Permissão de escrita em `%LOCALAPPDATA%\Programs\`**
   - Sintoma: `CreateDirectory` ou `WriteFile` retornando 5 (ACCESS_DENIED)
   - Fix: rodar como admin (botão direito → Executar como administrador)

3. **Path do user com caractere acentuado/espaço quebrando paths internos**
   - Sintoma: paths cortados ou com `?` no log
   - Fix: confirmar locale do Windows + path do user (`%USERPROFILE%`)

4. **VC++ runtime faltando** (Win 10 anterior a 1809)
   - Sintoma: app instala mas crasha no primeiro start, log Electron com `MSVCR*.dll not found`
   - Fix: instalar VC++ Redistributable 2015-2022 x64

5. **`differentialPackage` corrompendo o exe** (já forçado `false` em v0.12.3+ — improvável)
   - Sintoma: hash do `app.asar` não bate
   - Fix: forçar reinstall manual (não auto-update)

## Pra remover esses logs (quando o bug for fixado)

No `build/installer.nsh`:
- Remover `!verbose 4`
- Remover as macros `customInit`
- Remover `DetailPrint` e `CopyFiles` de log das macros `customInstall`/`customUnInstall`

Deixar apenas os `ExecWait '"$SYSDIR\ie4uinit.exe" -show'` (que é o fix do icon cache que veio em v0.12.3).
