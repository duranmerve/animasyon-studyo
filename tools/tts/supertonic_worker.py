# Supertonic 3 worker for tools/voice.mjs: preset voices (F1-F5, M1-M5), runs on the CPU.
# Every clip is checked with Whisper; a bad take is retried with more diffusion steps.
#   python supertonic_worker.py job.json      (job: { "voice_name", "speed", "lines": [...] , "tries", "max_cer" })
import json, os, sys, time

import numpy as np
import soundfile as sf
from faster_whisper import WhisperModel
from supertonic import TTS

sys.path.insert(0, os.path.dirname(__file__))
from omnivoice_worker_common import cer, trim  # noqa: E402

job = json.load(open(sys.argv[1], encoding="utf-8"))
tries = int(job.get("tries", 3))
max_cer = float(job.get("max_cer", 0.06))
t0 = time.time()
tts = TTS(model="supertonic-3", auto_download=True)
style = tts.get_voice_style(voice_name=job["voice_name"])
SR = tts.sample_rate
asr = WhisperModel("small", device="cpu", compute_type="int8",
                   download_root=os.path.join(os.environ.get("TTS_LAB", r"C:\ProgramData\tts_lab"), "whisper"))
print(json.dumps({"ready": round(time.time() - t0, 1)}), flush=True)

for line in job["lines"]:
    best = None
    for k in range(tries):
        wav, _ = tts.synthesize(line["text"], voice_style=style, lang="tr", total_steps=10 + 6 * k, speed=float(job.get("speed") or 1.0))
        x = trim(np.asarray(wav, dtype=np.float32).squeeze(), sr=SR)
        tmp = line["out"] + ".check.wav"
        sf.write(tmp, x, SR)
        heard = " ".join(s.text.strip() for s in asr.transcribe(tmp, language="tr", beam_size=5)[0])
        os.remove(tmp)
        c = cer(line.get("check", line["text"]), heard)
        if best is None or c < best[0]:
            best = (c, x, heard, k + 1)
        if c <= max_cer:
            break
    sf.write(line["out"], best[1], SR)
    print(json.dumps({"id": line["id"], "cer": round(best[0], 3), "tries": best[3],
                      "dur": round(len(best[1]) / SR, 3), "heard": best[2]}, ensure_ascii=False), flush=True)
