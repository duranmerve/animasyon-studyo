# Chatterbox Multilingual worker for tools/voice.mjs (MIT; adds Resemble's inaudible watermark).
# Speaks in its own voice or imitates a reference clip; v2 or v3 weights. Every clip is checked with
# Whisper and a bad take is retried with another seed.
#   python chatterbox_worker.py job.json   (job: { "model_version": "v2"|"v3", "ref_audio"|null, "lines": [...], ... })
import json, os, sys, time, zlib

import numpy as np
import soundfile as sf
import torch
from faster_whisper import WhisperModel
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

sys.path.insert(0, os.path.dirname(__file__))
from omnivoice_worker_common import cer, trim  # noqa: E402

job = json.load(open(sys.argv[1], encoding="utf-8"))
tries = int(job.get("tries", 4))
max_cer = float(job.get("max_cer", 0.06))
t0 = time.time()
dev = "cuda" if torch.cuda.is_available() else "cpu"
ver = job.get("model_version") or "v3"
model = ChatterboxMultilingualTTS.from_pretrained(device=dev) if ver == "v2" else ChatterboxMultilingualTTS.from_pretrained(device=dev, t3_model=ver)
SR = model.sr
asr = WhisperModel("small", device="cpu", compute_type="int8",
                   download_root=os.path.join(os.environ.get("TTS_LAB", r"C:\ProgramData\tts_lab"), "whisper"))
print(json.dumps({"ready": round(time.time() - t0, 1)}), flush=True)

for line in job["lines"]:
    best = None
    for k in range(tries):
        torch.manual_seed(zlib.crc32(line["id"].encode()) % 100000 + 7919 * k)
        kw = dict(language_id="tr", exaggeration=0.5, cfg_weight=0.5)
        if job.get("ref_audio"):
            kw["audio_prompt_path"] = job["ref_audio"]
        wav = model.generate(line["text"], **kw)
        x = trim(wav.squeeze().detach().cpu().numpy().astype(np.float32), sr=SR)
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
