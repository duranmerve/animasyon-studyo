# OmniVoice worker for tools/voice.mjs: speaks each line in a fixed voice (the voice's reference
# clip keeps it identical in every video), checks every clip with Whisper and retries bad takes.
#   python omnivoice_worker.py job.json
# job.json: { "ref_audio", "ref_text", "language", "speed", "num_step", "lines": [{ "id", "text", "out" }], "tries", "max_cer" }
# Prints one JSON line per finished clip: { "id", "cer", "tries", "dur", "heard" }.
import json, os, re, sys, time, zlib

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.dirname(__file__))
import torch
from faster_whisper import WhisperModel
from omnivoice import OmniVoice

SR = 24000
job = json.load(open(sys.argv[1], encoding="utf-8"))
tries = int(job.get("tries", 4))
max_cer = float(job.get("max_cer", 0.06))


from omnivoice_worker_common import cer, trim  # noqa: E402


t0 = time.time()
model = OmniVoice.from_pretrained("k2-fsa/OmniVoice", device_map="cuda:0" if torch.cuda.is_available() else "cpu",
                                  dtype=torch.float16 if torch.cuda.is_available() else torch.float32)
asr = WhisperModel("small", device="cpu", compute_type="int8",
                   download_root=os.path.join(os.environ.get("TTS_LAB", r"C:\ProgramData\tts_lab"), "whisper"))
print(json.dumps({"ready": round(time.time() - t0, 1)}), flush=True)

for line in job["lines"]:
    best = None
    for k in range(tries):
        torch.manual_seed(zlib.crc32(line["id"].encode()) % 100000 + 7919 * k)
        audio = model.generate(text=line["text"], language=job.get("language", "tr"),
                               ref_audio=job["ref_audio"], ref_text=job["ref_text"], speed=job.get("speed"),
                               num_step=int(job.get("num_step") or 32))
        x = trim(np.asarray(audio[0], dtype=np.float32))
        tmp = line["out"] + ".check.wav"
        sf.write(tmp, x, SR)
        segs, _ = asr.transcribe(tmp, language="tr", beam_size=5)
        heard = " ".join(s.text.strip() for s in segs)
        os.remove(tmp)
        c = cer(line.get("check", line["text"]), heard)
        if best is None or c < best[0]:
            best = (c, x, heard, k + 1)
        if c <= max_cer:
            break
    sf.write(line["out"], best[1], SR)
    print(json.dumps({"id": line["id"], "cer": round(best[0], 3), "tries": best[3],
                      "dur": round(len(best[1]) / SR, 3), "heard": best[2]}, ensure_ascii=False), flush=True)
