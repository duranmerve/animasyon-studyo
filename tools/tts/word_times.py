# Word timings for narration clips (for subtitles that appear word by word as they are spoken).
#   python word_times.py job.json   job: { "clips": [{ "id", "file" }] }
# Prints one JSON line per clip: { "id", "words": [[start, end, "word"], ...] } (seconds in the clip).
import json, os, sys

from faster_whisper import WhisperModel

job = json.load(open(sys.argv[1], encoding="utf-8"))
asr = WhisperModel("small", device="cpu", compute_type="int8",
                   download_root=os.path.join(os.environ.get("TTS_LAB", r"C:\ProgramData\tts_lab"), "whisper"))
print(json.dumps({"ready": True}), flush=True)
for c in job["clips"]:
    segs, _ = asr.transcribe(c["file"], language="tr", beam_size=5, word_timestamps=True, vad_filter=False)
    words = []
    for s in segs:
        for w in s.words or []:
            t = w.word.strip()
            if t:
                words.append([round(w.start, 3), round(w.end, 3), t])
    print(json.dumps({"id": c["id"], "words": words}, ensure_ascii=False), flush=True)
