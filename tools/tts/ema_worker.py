# EMA-TTS worker for tools/voice.mjs: one fixed Turkish voice (48 kHz), every clip checked with
# Whisper, bad takes retried with another seed. Same job format as omnivoice_worker.py plus
# "model_dir" (a local copy of an EMA-TTS repository with inference.py).
#   python ema_worker.py job.json
import json, os, sys, time, zlib

import numpy as np
import soundfile as sf
import torch
from faster_whisper import WhisperModel

sys.path.insert(0, os.path.dirname(__file__))
from omnivoice_worker_common import cer, trim  # noqa: E402

job = json.load(open(sys.argv[1], encoding="utf-8"))
root = job["model_dir"]
sys.path.insert(0, root)
os.chdir(root)
from inference import EmaTTS  # noqa: E402

SR = 48000
tries = int(job.get("tries", 4))
max_cer = float(job.get("max_cer", 0.06))
t0 = time.time()
ema = EmaTTS.from_pretrained("ckpt" if os.path.isdir(os.path.join(root, "ckpt")) else root,
                             device="cuda" if torch.cuda.is_available() else "cpu")
asr = WhisperModel("small", device="cpu", compute_type="int8",
                   download_root=os.path.join(os.environ.get("TTS_LAB", r"C:\ProgramData\tts_lab"), "whisper"))
print(json.dumps({"ready": round(time.time() - t0, 1)}), flush=True)

for line in job["lines"]:
    best = None
    for k in range(tries):
        seed = zlib.crc32(line["id"].encode()) % 100000 + 7919 * k
        kw = {"seed": seed}
        if job.get("speed"):
            kw["length_scale"] = 1.0 / float(job["speed"])
        try:
            wav = ema.say(line["text"], **kw)
        except TypeError:
            kw.pop("length_scale", None)
            wav = ema.say(line["text"], **kw)
        x = wav.detach().cpu().numpy() if torch.is_tensor(wav) else np.asarray(wav)
        x = trim(x.squeeze().astype(np.float32), sr=SR)
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
