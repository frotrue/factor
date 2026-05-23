# Neural Factory Agent Instructions

## Encoding

- Source files and documentation are UTF-8. Preserve UTF-8 when reading or editing Korean text.
- In Windows PowerShell, initialize UTF-8 before inspecting Korean project text. Some automation shells do not load `$PROFILE`, so prefix the command explicitly when Korean output matters:

```powershell
chcp 65001 | Out-Null
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new()
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [System.Text.UTF8Encoding]::new()
```

- Prefer explicit encoding for file reads that may include Korean:

```powershell
Get-Content README.md -Encoding UTF8
Get-Content src\config.ts -Encoding UTF8
```

- In `cmd.exe`, run `chcp 65001` before printing Korean text.
- If terminal output shows mojibake but the editor displays text correctly, treat it as a shell encoding issue before changing file contents.
