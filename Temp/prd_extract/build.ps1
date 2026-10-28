$ErrorActionPreference = 'Stop'
$specPath = 'C:\MBPTS\Temp\prd_extract\case1_spec.txt'
$prd = 'C:\MBPTS\PRD'
$src1Path = (Get-ChildItem "$prd\*Case1_*PRD_1026.docx" | Select-Object -First 1).FullName
$src2Path = (Get-ChildItem "$prd\*Case2*PRD_1027.docx" | Select-Object -First 1).FullName
$outName = (Split-Path $src1Path -Leaf) -replace 'Case1_', ('Case1' + [char]0xFF1A) -replace '_PRD_1026', '_PRD_1027'
$outPath = Join-Path $prd $outName
Copy-Item -LiteralPath $src2Path -Destination $outPath -Force

$lines = Get-Content -LiteralPath $specPath -Encoding UTF8

$w = New-Object -ComObject Word.Application
$w.Visible = $false
$w.DisplayAlerts = 0
try {
  $src1 = $w.Documents.Open($src1Path, $false, $true)
  $src2 = $w.Documents.Open($src2Path, $false, $true)
  $doc = $w.Documents.Open($outPath, $false, $false)
  $doc.TrackRevisions = $false

  $sampleBullet = @{ 1 = $src2.Paragraphs.Item(146).Range; 2 = $src2.Paragraphs.Item(456).Range; 3 = $src2.Paragraphs.Item(460).Range }
  $sampleTable = $src2.Paragraphs.Item(151).Range.Tables.Item(1).Range
  $styleNames = @{}
  foreach ($sid in -1, -2, -3, -4, -5) { $styleNames[$sid] = $doc.Styles.Item($sid).NameLocal }

  function EndPos { $doc.Content.End - 1 }
  function LastIsTable {
    $n = $doc.Paragraphs.Count
    if ($n -lt 2) { return $false }
    return [bool]$doc.Paragraphs.Item($n - 1).Range.Information(12)
  }
  function AddPlain([string]$text, $style, [bool]$bold) {
    $s = EndPos
    $r = $doc.Range($s, $s)
    $r.InsertAfter($text + "`r")
    $p = $doc.Range($s, $s).Paragraphs.Item(1)
    $p.Range.ParagraphFormat.Reset()
    $p.Range.Font.Reset()
    $p.Range.ListFormat.RemoveNumbers()
    $p.Range.Style = $styleNames[[int]$style]
    if ($bold) { $p.Range.Font.Bold = 1 }
  }
  function SplitLabel([string]$text) {
    if ($text.StartsWith('**')) {
      $i = $text.IndexOf('**', 2)
      if ($i -gt 2) { return @($text.Substring(2, $i - 2), $text.Substring($i + 2)) }
    }
    return @('', $text)
  }
  function AddBullet([int]$lvl, [string]$text) {
    $parts = SplitLabel $text
    $full = $parts[0] + $parts[1]
    $s = EndPos
    $r = $doc.Range($s, $s)
    $r.FormattedText = $sampleBullet[$lvl].FormattedText
    $e = EndPos
    $tr = $doc.Range($s, $e - 1)
    $tr.Text = $full
    $tr = $doc.Range($s, $s + $full.Length)
    $tr.Font.Bold = 0
    if ($parts[0].Length -gt 0) { $doc.Range($s, $s + $parts[0].Length).Font.Bold = 1 }
  }
  function AddTable($rows) {
    if (LastIsTable) { AddPlain '' -1 $false }
    $hdr = $rows[0]
    $nc = $hdr.Count
    $nr = $rows.Count
    $s = EndPos
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
        if ($v -eq '^') { $v = '' }
        $t.Cell($ri + 1, $ci + 1).Range.Text = ($v -replace '\\n', "`r")
      }
    }
    $t.Rows.Item(1).HeadingFormat = -1
    $t.PreferredWidthType = 2
    $t.PreferredWidth = 100
    $t.AutoFitBehavior(1)
    $t.AutoFitBehavior(2)
    for ($ci = 0; $ci -lt $nc; $ci++) {
      $anchor = 1
      for ($ri = 1; $ri -lt $nr; $ri++) {
        $v = ''
        if ($ci -lt $rows[$ri].Count) { $v = $rows[$ri][$ci] }
        if ($v -eq '^') {
          $t.Cell($anchor + 1, $ci + 1).Merge($t.Cell($ri + 1, $ci + 1))
          $t.Cell($anchor + 1, $ci + 1).Range.Text = ($rows[$anchor][$ci] -replace '\\n', "`r")
        } else { $anchor = $ri }
      }
    }
  }
  function CopyFrom($srcDoc, [int]$a, [int]$b) {
    if (LastIsTable) { AddPlain '' -1 $false }
    $rng = $srcDoc.Range($srcDoc.Paragraphs.Item($a).Range.Start, $srcDoc.Paragraphs.Item($b).Range.End)
    $s = EndPos
    $r = $doc.Range($s, $s)
    $r.FormattedText = $rng.FormattedText
  }

  foreach ($ln in $lines) {
    if ($ln -match '^!cell (\d+) (\d+) (\d+) (.*)$') {
      $doc.Tables.Item([int]$matches[1]).Cell([int]$matches[2], [int]$matches[3]).Range.Text = $matches[4]
    }
  }
  $cut = [int](($lines | Where-Object { $_ -match '^!cut ' } | Select-Object -First 1) -replace '^!cut ', '')
  $doc.Range($doc.Paragraphs.Item($cut).Range.Start, $doc.Content.End).Delete()
  if ($doc.Comments.Count -gt 0) { $doc.DeleteAllComments() }
  $lp = $doc.Paragraphs.Item($doc.Paragraphs.Count)
  $lp.Range.ListFormat.RemoveNumbers()
  $lp.Range.Style = $styleNames[-1]

  $tableRows = New-Object System.Collections.ArrayList
  $flush = {
    if ($tableRows.Count -gt 0) { AddTable ($tableRows.ToArray()); $tableRows.Clear() }
  }
  $count = 0
  foreach ($ln in $lines) {
    if ($ln.StartsWith('|')) { [void]$tableRows.Add([string[]]($ln.Substring(1).Split('|'))); continue }
    & $flush
    if ($ln -match '^!' -or $ln.Trim() -eq '') { continue }
    $count++
    if ($ln -match '^#([1-4]) (.*)$') { AddPlain $matches[2] (-1 - [int]$matches[1]) $false }
    elseif ($ln -match '^(-{1,3}) (.*)$') { AddBullet $matches[1].Length $matches[2] }
    elseif ($ln -match '^>b (.*)$') { AddPlain $matches[1] -1 $true }
    elseif ($ln -match '^> ?(.*)$') { AddPlain $matches[1] -1 $false }
    elseif ($ln -match '^@c([12]) (\d+)-(\d+)$') {
      $sd = if ($matches[1] -eq '1') { $src1 } else { $src2 }
      CopyFrom $sd ([int]$matches[2]) ([int]$matches[3])
    }
    else { AddPlain $ln -1 $false }
  }
  & $flush
  if ($doc.TablesOfContents.Count -gt 0) { $doc.TablesOfContents.Item(1).Update() }
  $doc.Save()
  "DONE items=$count paragraphs=$($doc.Paragraphs.Count) tables=$($doc.Tables.Count) shapes=$($doc.InlineShapes.Count)"
  "OUT=$outPath"
}
finally {
  foreach ($d in @($doc, $src1, $src2)) { if ($d) { try { $d.Close($false) } catch {} } }
  $w.Quit()
}
