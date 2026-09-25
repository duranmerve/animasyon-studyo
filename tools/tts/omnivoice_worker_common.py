# Shared helpers for the TTS workers: Turkish-aware comparison with the Whisper transcript,
# and trimming of leading/trailing silence.
import re

import numpy as np

ONES = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"]
TENS = ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"]


def num_tr(n):
    """Turkish words for a whole number (so '600' and 'altı yüz' compare equal)."""
    if n == 0:
        return "sıfır"
    out = []
    for value, name in ((10**9, "milyar"), (10**6, "milyon"), (1000, "bin")):
        if n >= value:
            q, n = divmod(n, value)
            out.append(name if (q == 1 and value == 1000) else f"{num_tr(q)} {name}")
    if n >= 100:
        q, n = divmod(n, 100)
        out.append("yüz" if q == 1 else f"{ONES[q]} yüz")
    if n >= 10:
        out.append(TENS[n // 10]); n %= 10
    if n:
        out.append(ONES[n])
    return " ".join(out)


def norm(s):
    s = re.sub(r"\d+", lambda m: " " + num_tr(int(m.group())) + " ", s)
    s = s.replace("İ", "i").replace("I", "ı").lower()
    s = s.replace("â", "a").replace("î", "i").replace("û", "u")
    return "".join(re.sub(r"[^a-zçğıöşü ]", " ", s).split())


def cer(ref, hyp):
    a, b = norm(ref), norm(hyp)
    d = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        prev, d[0] = d[0], i
        for j, cb in enumerate(b, 1):
            prev, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, prev + (ca != cb))
    return d[len(b)] / max(1, len(a))


def trim(x, thr=0.01, pad=0.08, sr=24000):
    """Cut leading/trailing silence, keep a short natural pad."""
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0:
        return x
    a = max(0, idx[0] - int(pad * sr))
    b = min(len(x), idx[-1] + int(pad * sr))
    return x[a:b]
