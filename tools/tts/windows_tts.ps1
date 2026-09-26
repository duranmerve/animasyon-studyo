# Windows' own system voices (the same ones Chrome/Edge speechSynthesis uses on Windows,
# e.g. "Microsoft Tolga" for Turkish). Runs offline, no GPU. Called by tools/voice.mjs:
#   powershell -File windows_tts.ps1 <job.json>
# job: { voice: "Tolga", rate: 1.0, pitch: 1.0, lines: [{ id, text, out }] }
# Prints one JSON line per clip: { id, dur, words: [[start, end, word], ...] }
param([string]$JobFile)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
function Await($op, [type]$t) { $task = $asTask.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(-1) | Out-Null; $task.Result }

$job = Get-Content -Raw -Encoding UTF8 $JobFile | ConvertFrom-Json
$synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
$all = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices
$voice = $all | Where-Object { $_.DisplayName -like "*$($job.voice)*" } | Select-Object -First 1
if (-not $voice) { $voice = $all | Where-Object { $_.Language -like 'tr*' } | Select-Object -First 1 }
if (-not $voice) { [Console]::Error.WriteLine("Türkçe Windows sesi bulunamadı. Ayarlar > Zaman ve dil > Konuşma > Ses ekle > Türkçe"); exit 2 }
$synth.Voice = $voice
$synth.Options.IncludeWordBoundaryMetadata = $true
if ($job.rate) { $synth.Options.SpeakingRate = [double]$job.rate }
if ($job.pitch) { $synth.Options.AudioPitch = [double]$job.pitch }
Write-Output (@{ ready = $voice.DisplayName } | ConvertTo-Json -Compress)

foreach ($line in $job.lines) {
  $stream = Await ($synth.SynthesizeTextToStreamAsync($line.text)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
  $size = [uint32]$stream.Size
  $reader = New-Object Windows.Storage.Streams.DataReader($stream.GetInputStreamAt(0))
  $null = Await ($reader.LoadAsync($size)) ([uint32])
  $bytes = New-Object byte[] $size
  $reader.ReadBytes($bytes)
  [IO.File]::WriteAllBytes($line.out, $bytes)
  # duration from the WAV header
  $o = 12; $bps = 0; $data = 0
  while ($o + 8 -le $bytes.Length) {
    $cid = [Text.Encoding]::ASCII.GetString($bytes, $o, 4); $cs = [BitConverter]::ToUInt32($bytes, $o + 4)
    if ($cid -eq 'fmt ') { $bps = [BitConverter]::ToUInt32($bytes, $o + 16) }
    if ($cid -eq 'data') { $data = [Math]::Min($cs, $bytes.Length - $o - 8); break }
    $o += 8 + $cs + ($cs -band 1)
  }
  $dur = if ($bps) { $data / $bps } else { 0 }
  # word boundaries: start times from the voice; a word ends where the next one starts (or at clip end)
  $cues = @()
  foreach ($track in $stream.TimedMetadataTracks) {
    if ($track.Id -ne 'SpeechWord') { continue }
    foreach ($c in $track.Cues) { $cues += ,@([Math]::Round($c.StartTime.TotalSeconds, 3), $c.Text) }
  }
  $words = @()
  for ($i = 0; $i -lt $cues.Count; $i++) {
    $end = if ($i + 1 -lt $cues.Count) { $cues[$i + 1][0] } else { [Math]::Round($dur, 3) }
    $words += ,@($cues[$i][0], $end, $cues[$i][1])
  }
  Write-Output (@{ id = $line.id; dur = [Math]::Round($dur, 3); words = $words } | ConvertTo-Json -Compress -Depth 5)
}
