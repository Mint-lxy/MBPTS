$ErrorActionPreference = 'Stop'
$specPath = 'C:\MBPTS\Temp\prd_extract\task2_spec.txt'
$prd = 'C:\MBPTS\PRD'
$outPath = (Get-ChildItem "$prd\*PRD_1027.docx" | Where-Object { $_.Name -like '*Case1*' } | Select-Object -First 1).FullName
$src2Path = (Get-ChildItem "$prd\*Case2*PRD_1027.docx" | Select-Object -First 1).FullName
$lines = Get-Content -LiteralPath $specPath -Encoding UTF8
$marker = '@@TASK2MARK@@'

$w = New-Object -ComObject Word.Application
$w.Visible = $false
$w.DisplayAlerts = 0
try {
  $src2 = $w.Documents.Open($src2Path, $false, $true)
  $doc = $w.Documents.Open($outPath, $false, $false)
  $doc.TrackRevisions = $false
  $sampleTable = $src2.Paragraphs.Item(151).Range.Tables.Item(1).Range
  $styleNames = @{}
  foreach ($sid in -1, -2, -3, -4, -5) { $styleNames[$sid] = $doc.Styles.Item($sid).NameLocal }

  function MarkerPos {
    $mr = $doc.Content
    $f = $mr.Find
    $f.ClearFormatting()
    if (-not $f.Execute($marker)) { throw 'marker not found' }
    return $mr.Start
  }
  function PrevIsTable {
    $p = MarkerPos
    return [bool]$doc.Range($p - 1, $p).Information(12)
  }
  function AddPlain([string]$text, [bool]$bold) {
    $s = MarkerPos
    $doc.Range($s, $s).InsertAfter($text + "`r")
    $p = $doc.Range($s, $s).Paragraphs.Item(1)
    $p.Range.ParagraphFormat.Reset()
    $p.Range.Font.Reset()
    $p.Range.ListFormat.RemoveNumbers()
    $p.Range.Style = $styleNames[-1]
    if ($bold) { $p.Range.Font.Bold = 1 }
  }
  function AddTable($rows) {
    if ($script:lastWasTable) { AddPlain '' $false }
    $nc = $rows[0].Count
    $nr = $rows.Count
    $s = MarkerPos
    $r = $doc.Range($s, $s)
    $r.FormattedText = $sampleTable.FormattedText
    $t = $doc.Range($s, $s + 1).Tables.Item(1)
    while ($t.Columns.Count -lt $nc) { [void]$t.Columns.Add() }
    while ($t.Columns.Count -gt $nc) { $t.Columns.Item($t.Columns.Count).Delete() }
    while ($t.Rows.Count -lt $nr) { [void]$t.Rows.Add() }
    while ($t.Rows.Count -gt $nr) { $t.Rows.Item($t.Rows.Count).Delete() }
    for ($ri = 0; $ri -lt $nr; $ri++) {
      for ($ci = 0; $ci -lt $nc; $ci++) {
        $v = ''
        if ($ci -lt $rows[$ri].Count) { $v = $rows[$ri][$ci] }
        $t.Cell($ri + 1, $ci + 1).Range.Text = $v
      }
    }
    $t.Rows.Item(1).HeadingFormat = -1
    $t.PreferredWidthType = 2
    $t.PreferredWidth = 100
    $t.AutoFitBehavior(1)
    $t.AutoFitBehavior(2)
  }

  $headingText = (($lines | Where-Object { $_ -match '^!heading ' } | Select-Object -First 1) -replace '^!heading ', '')
  $hr = $doc.Content
  $hf = $hr.Find
  $hf.ClearFormatting()
  $hf.Style = $styleNames[-5]
  $hf.Format = $true
  $hf.Wrap = 0
  if (-not $hf.Execute($headingText)) { throw 'task2 heading not found' }
  $bodyStart = $hr.Paragraphs.Item(1).Range.End

  $nr2 = $doc.Range($bodyStart, $doc.Content.End)
  $nf = $nr2.Find
  $nf.ClearFormatting()
  $nf.Style = $styleNames[-5]
  $nf.Format = $true
  $nf.Wrap = 0
  if (-not $nf.Execute('')) { throw 'next heading not found' }
  $nextPara = $nr2.Paragraphs.Item(1)
  $bodyEnd = $nextPara.Range.Start
  "TASK2 heading at $($bodyStart); next heading: $($nextPara.Range.Text.Trim()) at $bodyEnd; removing $($doc.Range($bodyStart,$bodyEnd).Paragraphs.Count) paragraphs"

  $doc.Range($bodyStart, $bodyEnd).Delete() | Out-Null
  $doc.Range($bodyStart, $bodyStart).InsertAfter($marker + "`r")
  $mp = $doc.Range($bodyStart, $bodyStart).Paragraphs.Item(1)
  $mp.Range.ParagraphFormat.Reset()
  $mp.Range.Font.Reset()
  $mp.Range.Style = $styleNames[-1]
  $mp.Range.ListFormat.RemoveNumbers()

  $script:lastWasTable = $false
  $tableRows = New-Object System.Collections.ArrayList
  foreach ($ln in $lines) {
    if ($ln.StartsWith('|')) { [void]$tableRows.Add([string[]]($ln.Substring(1).Split('|'))); continue }
    if ($tableRows.Count -gt 0) { AddTable ($tableRows.ToArray()); $tableRows.Clear(); $script:lastWasTable = $true }
    if ($ln -match '^!' -or $ln.Trim() -eq '') { continue }
    if ($ln -match '^>b (.*)$') { AddPlain $matches[1] $true; $script:lastWasTable = $false }
    elseif ($ln -match '^> ?(.*)$') { AddPlain $matches[1] $false; $script:lastWasTable = $false }
  }
  if ($tableRows.Count -gt 0) { AddTable ($tableRows.ToArray()); $tableRows.Clear() }

  $mr = $doc.Content
  [void]$mr.Find.Execute($marker)
  $mr.Text = ''

  foreach ($ln in ($lines | Where-Object { $_ -match '^!fix ' })) {
    $p = ($ln -replace '^!fix ', '') -split '\|\|\|'
    $fr = $doc.Content
    $ff = $fr.Find
    $ff.ClearFormatting()
    $ff.Replacement.ClearFormatting()
    $ok = $ff.Execute($p[0], $false, $false, $false, $false, $false, $true, 0, $false, $p[1], 2)
    "fix ok=$ok"
  }
  if ($doc.TablesOfContents.Count -gt 0) { $doc.TablesOfContents.Item(1).Update() }
  $doc.Save()
  "DONE tables=$($doc.Tables.Count) paragraphs=$($doc.Paragraphs.Count)"
}
finally {
  foreach ($d in @($doc, $src2)) { if ($d) { try { $d.Close($false) } catch {} } }
  $w.Quit()
}
