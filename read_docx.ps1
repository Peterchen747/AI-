[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$folder = Get-ChildItem 'c:\' -Directory | Where-Object { $_.Name -like 'AI*' } | Select-Object -First 1
$docFile = Get-ChildItem $folder.FullName | Where-Object { $_.Name -like '*v3*' }
$tempPath = "$env:TEMP\roadmap_temp.docx"
Copy-Item $docFile.FullName $tempPath -Force

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($tempPath)
$entry = $zip.GetEntry('word/document.xml')
$reader = New-Object System.IO.StreamReader($entry.Open(), [System.Text.Encoding]::UTF8)
$xml = $reader.ReadToEnd()
$reader.Close()
$zip.Dispose()

$paragraphs = [regex]::Matches($xml, '<w:p[ >][\s\S]*?</w:p>')
foreach ($para in $paragraphs) {
    $tmatches = [regex]::Matches($para.Value, '<w:t[^>]*>([^<]*)</w:t>')
    $line = ($tmatches | ForEach-Object { $_.Groups[1].Value }) -join ''
    if ($line.Trim()) { Write-Output $line }
}
Remove-Item $tempPath -Force
