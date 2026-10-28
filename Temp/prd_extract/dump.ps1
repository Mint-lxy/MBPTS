param([string]$path,[string]$outFile)
$w = New-Object -ComObject Word.Application
$w.Visible = $false
$d = $w.Documents.Open($path, $false, $true)
$sb = New-Object System.Text.StringBuilder
$n = $d.Paragraphs.Count
$lastTable = 0
for ($i = 1; $i -le $n; $i++) {
  $p = $d.Paragraphs.Item($i)
  $r = $p.Range
  $inTable = $r.Information(12)
  $t = $r.Text -replace "[\r\a]", "" -replace "\v", " / "
  $style = $p.Style.NameLocal
  $lvl = $p.OutlineLevel
  $shp = $r.InlineShapes.Count
  $lst = $r.ListFormat.ListString
  if ($inTable) {
    $tbl = $r.Tables.Item(1)
    $cell = $r.Cells.Item(1)
    $sb.AppendLine("[$i][T r$($cell.RowIndex)c$($cell.ColumnIndex)] $t" + $(if($shp){" <IMG x$shp>"}else{""})) | Out-Null
  } else {
    $sb.AppendLine("[$i][$style|L$lvl] $lst $t" + $(if($shp){" <IMG x$shp>"}else{""})) | Out-Null
  }
}
[IO.File]::WriteAllText($outFile, $sb.ToString(), [Text.Encoding]::UTF8)
$d.Close($false)
$w.Quit()
