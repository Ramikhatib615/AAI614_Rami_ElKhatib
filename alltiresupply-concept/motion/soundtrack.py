"""Original soundtrack + sound design for the All Tire Supply motion piece.

Everything is synthesized here (no samples, no third-party audio), timed to
motion.html. Output: 48 kHz stereo WAV.
Usage: python3 soundtrack.py out.wav
"""
import sys
import numpy as np
from scipy.signal import butter, sosfilt, stft, istft, fftconvolve

SR = 48000
DUR = 67.0
N = int((DUR + 3) * SR)
rng = np.random.default_rng(7)

# ---------------- buses ----------------
dry = np.zeros((2, N))
rev = np.zeros((2, N))      # reverb send
arpb = np.zeros((2, N))     # arp bus (gets ping-pong delay)
music_sc = np.zeros((2, N))  # pad + bass bus (gets sidechain)


def place(bus, sig, t, pan=0.0, gain=1.0):
    if t < 0:
        sig = sig[int(-t * SR):]
        t = 0
    i = int(t * SR)
    if i >= N or len(sig) == 0:
        return
    sig = sig[: N - i] * gain
    a = (pan + 1) * np.pi / 4
    bus[0, i:i + len(sig)] += sig * np.cos(a)
    bus[1, i:i + len(sig)] += sig * np.sin(a)


def tt(dur):
    return np.arange(int(dur * SR)) / SR


def mf(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, fc, order=2):
    fc = min(fc, SR * 0.45)
    return sosfilt(butter(order, fc, 'low', fs=SR, output='sos'), x)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, 'high', fs=SR, output='sos'), x)


def bp(x, f1, f2, order=2):
    return sosfilt(butter(order, [f1, min(f2, SR * 0.45)], 'band', fs=SR, output='sos'), x)


def env_ad(n, a, d, shape=4.0):
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-4), np.exp(-(t - a) * shape / max(d, 1e-4)))
    return e


def saw(f, t):
    ph = np.cumsum(np.broadcast_to(f, t.shape) / SR) if np.ndim(f) else f * t
    return 2 * (ph % 1.0) - 1


def swept_noise(dur, f0, f1, bw=0.8):
    n = int(dur * SR)
    x = rng.standard_normal(n + 2048)
    f, tf, Z = stft(x, SR, nperseg=1024, noverlap=768)
    frac = np.clip(tf / dur, 0, 1)
    centers = f0 * (f1 / f0) ** frac
    lf = np.log2(f[:, None] + 1.0)
    mask = np.exp(-0.5 * ((lf - np.log2(centers[None, :])) / (bw / 2)) ** 2)
    _, y = istft(Z * mask, SR, nperseg=1024, noverlap=768)
    y = y[:n]
    return y / (np.max(np.abs(y)) + 1e-9)


# ---------------- instruments ----------------
def kick(t0, g=1.0):
    t = tt(0.5)
    f = 46 + 110 * np.exp(-t * 32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 6.5)
    click = rng.standard_normal(len(t)) * np.exp(-t * 900) * 0.4
    place(dry, np.tanh(1.6 * (s + click)) * 0.9, t0, 0, g)


def snare(t0, g=1.0, pan=0.0):
    t = tt(0.3)
    n = bp(rng.standard_normal(len(t)), 900, 7000) * np.exp(-t * 18)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)
    s = n * 0.8 + tone * 0.5
    place(dry, s, t0, pan, g * 0.55)
    place(rev, s, t0, pan, g * 0.25)


def clap(t0, g=1.0):
    t = tt(0.35)
    n = bp(rng.standard_normal(len(t)), 900, 4200)
    e = np.zeros(len(t))
    for k, off in enumerate([0, .011, .022]):
        i = int(off * SR)
        e[i:] += np.exp(-(t[: len(t) - i]) * (90 if k < 2 else 16))
    s = n * e
    place(dry, s, t0, 0.08, g * 0.45)
    place(rev, s, t0, -0.1, g * 0.35)


def hat(t0, g=1.0, open_=False, pan=0.25):
    t = tt(0.4 if open_ else 0.08)
    n = hp(rng.standard_normal(len(t)), 7500, 4) * np.exp(-t * (11 if open_ else 70))
    place(dry, n, t0, pan, g * (0.16 if open_ else 0.12))


def bass(t0, m, dur, g=1.0, cut=700):
    t = tt(dur + 0.05)
    f = mf(m)
    s = saw(f, t) * 0.7 + np.sin(2 * np.pi * f * t) * 0.6 + np.sin(np.pi * f * t) * 0.35
    fe = cut * (0.35 + 0.65 * np.exp(-t * 9))
    s = lp(s, cut, 3) * 0.6 + lp(s, cut * 0.4, 2) * 0.4
    e = np.minimum(1, t / 0.006) * np.exp(-t * 2.2) * (t < dur)
    e = e + (t >= dur) * np.exp(-(t - dur) * 60) * np.exp(-dur * 2.2)
    place(music_sc, np.tanh(1.8 * s * e) * 0.55, t0, 0, g)


def pad(t0, notes, dur, g=1.0, cut=1800, att=0.6, rel=1.2, pan_spread=0.5):
    t = tt(dur + rel)
    e = np.minimum(1, t / att) * np.where(t < dur, 1, np.exp(-(t - dur) * 4 / rel))
    for k, m in enumerate(notes):
        f = mf(m)
        s = np.zeros(len(t))
        for d in (-0.11, 0.0, 0.13):
            s += saw(f * 2 ** (d / 12), t + rng.random())
        s = lp(s / 3, cut, 2)
        pan = (k / max(1, len(notes) - 1) - 0.5) * 2 * pan_spread
        place(music_sc, s * e * 0.10, t0, pan, g)
        place(rev, s * e * 0.06, t0, -pan, g)


def pluck(t0, m, g=1.0, pan=0.0, dec=7.0):
    t = tt(0.6)
    f = mf(m)
    s = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(4 * np.pi * f * t) * np.exp(-t * 12)
         + 0.25 * saw(f, t) * np.exp(-t * 20))
    s *= np.minimum(1, t / 0.003) * np.exp(-t * dec)
    place(arpb, lp(s, 5000) * 0.22, t0, pan, g)


def bell(t0, f, g=1.0, pan=0.0, dec=2.5, wet=0.5):
    t = tt(2.5)
    s = np.zeros(len(t))
    for r, a, d in [(1, 1, 1), (2.76, .5, 1.8), (5.4, .25, 3), (8.93, .12, 5)]:
        s += a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * dec * d)
    s *= np.minimum(1, t / 0.002)
    place(dry, s * 0.18, t0, pan, g)
    place(rev, s * 0.18, t0, pan, g * wet)


def blip(t0, f, g=1.0, pan=0.0, dur=0.07):
    t = tt(dur)
    s = np.sin(2 * np.pi * f * t) * np.sin(np.pi * t / dur) ** 2
    place(dry, s * 0.2, t0, pan, g)


def pop(t0, f=700, g=1.0, pan=0.0):
    t = tt(0.12)
    fr = f * (0.55 + 0.45 * (1 - np.exp(-t * 60)))
    s = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 32) * np.minimum(1, t / 0.002)
    place(dry, s * 0.32, t0, pan, g)
    place(rev, s * 0.1, t0, pan, g)


def tick(t0, g=1.0, pan=0.0, f1=2500, f2=7000):
    t = tt(0.02)
    s = bp(rng.standard_normal(len(t)), f1, f2) * np.exp(-t * 400)
    place(dry, s * 0.5, t0, pan, g)


def clink(t0, g=1.0, pan=0.0, base=2100):
    t = tt(0.5)
    s = np.zeros(len(t))
    for r, a in [(1, 1), (1.62, .7), (2.48, .5), (3.77, .3)]:
        s += a * np.sin(2 * np.pi * base * r * t) * np.exp(-t * (14 + 6 * r))
    s *= np.minimum(1, t / 0.0008)
    place(dry, s * 0.12, t0, pan, g)
    place(rev, s * 0.08, t0, pan, g)


def whoosh(tc, dur=0.9, g=1.0, up=True, pan_from=-0.7, pan_to=0.7, f_lo=250, f_hi=7000):
    y = swept_noise(dur, f_lo if up else f_hi, f_hi if up else f_lo, bw=1.1)
    t = np.arange(len(y)) / SR
    pk = 0.62
    e = np.where(t < dur * pk, (t / (dur * pk)) ** 2.2, np.exp(-(t - dur * pk) * 7))
    y = y * e
    # stereo pan sweep
    n = len(y)
    pans = np.linspace(pan_from, pan_to, n)
    a = (pans + 1) * np.pi / 4
    i = int((tc - dur * pk) * SR)
    if i < 0:
        return
    dry[0, i:i + n] += y * np.cos(a) * 0.32 * g
    dry[1, i:i + n] += y * np.sin(a) * 0.32 * g
    rev[:, i:i + n] += y * 0.12 * g


def riser(t0, t1, g=1.0):
    dur = t1 - t0
    y = swept_noise(dur, 300, 9000, bw=1.4)
    t = np.arange(len(y)) / SR
    e = (t / dur) ** 2.5
    sw = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (2.2 * t / dur)) / SR) * 0.35
    trem = 0.75 + 0.25 * np.sin(2 * np.pi * (4 + 14 * t / dur) * t)
    s = (y * 0.8 + sw) * e * trem
    place(dry, s * 0.32, t0, 0, g)
    place(rev, s * 0.15, t0, 0, g)


def rev_cymbal(t_end, dur=1.2, g=1.0):
    t = tt(dur)
    n = hp(rng.standard_normal(len(t)), 5000, 2)
    e = np.exp((t - dur) * 4.5)
    place(dry, n * e * 0.18, t_end - dur, 0, g)
    place(rev, n * e * 0.12, t_end - dur, 0, g)


def impact(t0, g=1.0, size=1.0):
    t = tt(2.8)
    f = 38 + 60 * np.exp(-t * 8)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6 / size)
    crack = lp(rng.standard_normal(len(t)), 3500) * np.exp(-t * 14)
    body = bp(rng.standard_normal(len(t)), 120, 900) * np.exp(-t * 5)
    s = np.tanh(1.4 * (sub * 0.9 + crack * 0.45 + body * 0.4))
    place(dry, s * 0.8, t0, 0, g)
    place(rev, (crack * 0.5 + body * 0.4) * 0.6, t0, 0, g * size)


def stamp(t0, g=1.0):
    t = tt(0.9)
    thud = np.sin(2 * np.pi * np.cumsum(55 + 90 * np.exp(-t * 25)) / SR) * np.exp(-t * 9)
    slap = bp(rng.standard_normal(len(t)), 600, 2600) * np.exp(-t * 45)
    s = np.tanh(1.5 * (thud + slap * 0.9))
    place(dry, s * 0.85, t0, 0.15, g)
    place(rev, slap * 0.5, t0, 0, g)


def wrench(t0, dur=0.55, g=1.0, pan=0.0):
    """Pneumatic impact-wrench 'brrrt': hammer blows + motor whine."""
    t = tt(dur + 0.2)
    out = np.zeros(len(t))
    rate = 26.0
    k = 0
    while k / rate < dur:
        i = int(k / rate * SR)
        seg = tt(0.05)
        blow = bp(rng.standard_normal(len(seg)), 1400, 4200) * np.exp(-seg * 120)
        thk = np.sin(2 * np.pi * 140 * seg) * np.exp(-seg * 90)
        out[i:i + len(seg)] += (blow * 0.8 + thk * 0.6)[: len(out) - i]
        k += 1
    whine = saw(np.linspace(170, 260, len(t)), t) * 0.12
    e = np.minimum(1, t / 0.03) * np.where(t < dur, 1, np.exp(-(t - dur) * 30))
    s = lp(out + lp(whine, 1500), 6000) * e
    place(dry, s * 0.32, t0, pan, g)
    place(rev, s * 0.08, t0, pan, g)


def air_hiss(t0, dur=0.6, g=1.0, pan=0.0):
    t = tt(dur)
    n = bp(rng.standard_normal(len(t)), 2500, 11000, 3)
    e = np.minimum(1, t / 0.01) * np.exp(-t * 4.5 / dur)
    place(dry, n * e * 0.16, t0, pan, g)
    place(rev, n * e * 0.05, t0, pan, g)


def rumble(t0, dur, g=1.0):
    t = tt(dur)
    n = lp(rng.standard_normal(len(t)), 180, 3)
    wob = np.sin(2 * np.pi * 32 * t) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t))
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    place(dry, (n * 1.6 + wob * 0.5) * e * 0.35, t0, 0.2, g)


def sparkle(t0, t1, dens=10, g=1.0, lo=84, hi=101):
    scale = [0, 2, 3, 7, 9]  # A minor pentatonic-ish (A C D E G via offsets on A)
    pool = [m for m in range(lo, hi) if (m - 57) % 12 in (0, 3, 5, 7, 10)]
    n = int((t1 - t0) * dens)
    for _ in range(n):
        tm = t0 + rng.random() * (t1 - t0)
        bell(tm, mf(pool[rng.integers(len(pool))]), g=g * (0.25 + 0.3 * rng.random()), pan=rng.uniform(-.8, .8), dec=3.5, wet=0.9)


def scanner(t0, t1, g=1.0):
    t = tt(t1 - t0)
    hum = (np.sin(2 * np.pi * 220 * t) + 0.5 * np.sin(2 * np.pi * 331 * t)) * (0.6 + 0.4 * np.sin(2 * np.pi * 3.2 / (2 * np.pi) * 2 * np.pi * t))
    e = np.minimum(1, t / 0.2) * np.minimum(1, (t1 - t0 - t) / 0.2)
    place(dry, lp(hum, 1200) * e * 0.05, t0, -0.3, g)


def counter_ticks(t0, t1, n, f0=1400, f1=2600, g=1.0, pan=0.0):
    for k in range(n):
        x = k / max(1, n - 1)
        tm = t0 + (t1 - t0) * (1 - (1 - x) ** 1.6)  # slows like an ease-out counter
        blip(tm, f0 + (f1 - f0) * x, g=g * 0.45, pan=pan, dur=0.03)


def typing(t0, t1, cps=24, g=1.0, pan=0.0):
    tm = t0
    while tm < t1:
        tick(tm, g=g * (0.5 + 0.5 * rng.random()), pan=pan, f1=2000 + 1500 * rng.random(), f2=7000)
        tm += (1.0 / cps) * (0.6 + 0.8 * rng.random())


def success(t0, g=1.0, root=81):
    for k, iv in enumerate([0, 4, 7, 12]):
        bell(t0 + k * 0.055, mf(root + iv), g=g * 0.8, pan=-0.3 + k * 0.2, dec=3)


def cash(t0, g=1.0):
    bell(t0, mf(93), g=g, pan=0.2, dec=2.5)
    bell(t0 + 0.07, mf(100), g=g * 0.8, pan=0.35, dec=2.5)
    clink(t0, g=g * 0.8, pan=0.2, base=3100)


# ---------------- MUSIC ----------------
BEAT = 0.5
G0 = 5.35  # downbeat of the drop ("Equip it.")
PROG = [  # (bass midi, pad notes, arp notes)
    (45, [57, 60, 64, 71], [69, 72, 76, 79, 83, 79, 76, 72]),   # Am(add9)
    (41, [53, 57, 60, 64], [65, 69, 72, 76, 81, 76, 72, 69]),   # Fmaj7
    (48, [55, 60, 64, 67], [67, 72, 76, 79, 84, 79, 76, 72]),   # C
    (43, [55, 59, 62, 69], [67, 71, 74, 79, 81, 79, 74, 71]),   # G(add9-ish)
]


def in_any(t, ranges):
    return any(a <= t < b for a, b in ranges)


KICK_R = [(5.35, 19.2), (23.35, 46.35), (47.35, 59.35)]
CLAP_R = [(7.35, 19.2), (25.35, 46.35), (47.35, 59.35)]
HAT_R = [(5.35, 46.35), (47.35, 59.35)]
BASS_R = [(5.35, 46.35), (47.35, 60.35)]
ARP_R = [(11.35, 59.35)]

# intro bed
place(music_sc, 0.6 * np.sin(2 * np.pi * 55 * tt(5.6)) * np.minimum(1, tt(5.6) / 1.5) * np.minimum(1, (5.6 - tt(5.6)) / 0.4) * 0.22, 0)
pad(0.0, [57, 64, 71, 76], 2.6, g=2.0, cut=1300, att=1.4, rel=1.0)
pad(2.6, [53, 60, 64, 69], 2.5, g=2.1, cut=1700, att=0.8, rel=0.5)

nbars = int((61.2 - G0) / (4 * BEAT)) + 1
for j in range(nbars):
    b0 = G0 + j * 4 * BEAT
    bm, pn, ar = PROG[j % 4]
    if b0 >= 61.2:
        break
    # pad per bar (warmer in copilot section, brighter in fleet)
    cut = 1500 if b0 < 11.35 else 2000
    if 19.2 <= b0 < 30: cut = 1300
    if 43.2 <= b0 < 49.6: cut = 3200
    pg = 0.75 if b0 < 55.4 else 0.95
    pad(b0, pn, 4 * BEAT - 0.02, g=pg, cut=cut, att=0.25, rel=0.4)
    for k in range(8):  # 8th notes within the bar
        t = b0 + k * BEAT / 2
        if t >= 61.2:
            break
        beat_idx = k // 2
        on_beat = k % 2 == 0
        if on_beat and in_any(t, KICK_R):
            kick(t, 0.95)
        if on_beat and beat_idx in (1, 3) and in_any(t, CLAP_R):
            clap(t, 0.9)
        if in_any(t, HAT_R):
            if not on_beat:
                hat(t, 0.9, open_=(t >= 11.35), pan=0.3)
            elif t >= 11.35:
                hat(t, 0.5, pan=-0.2)
        if in_any(t, BASS_R):
            oct_ = 12 if (k in (3, 7) and t > 11.35) else 0
            bcut = 900 if 43.2 <= t < 49.6 else 650
            bass(t, bm + oct_, BEAT / 2 * 0.85, g=0.85 if 19.2 <= t < 23.35 else 1.0, cut=bcut)
    # 16th-note arp
    for k in range(16):
        t = b0 + k * BEAT / 4
        if not in_any(t, ARP_R) or t >= 61.2:
            continue
        m = ar[k % 8]
        if 30.0 <= t < 36.8:
            m += 12 if k % 4 == 3 else 0
        g = 0.55
        if 19.2 <= t < 30.2: g = 0.65
        if 30.0 <= t < 36.8: g = 0.8
        if 49.4 <= t < 55.6: g = 0.8
        if 55.4 <= t: g = 0.55 + 0.4 * (t - 55.4) / 4
        pluck(t, m, g=g, pan=(-0.45 if k % 2 else 0.45), dec=8 if t < 43.2 else 6)
    # extra closed 16th hats in mobile + numbers sections
    if 49.4 <= b0 < 59.35:
        for k in range(16):
            if k % 2:
                hat(b0 + k * BEAT / 4, 0.45, pan=0.5)

# snare roll build into the outro
t = 59.35
gap = 0.25
while t < 61.15:
    snare(t, g=0.35 + 0.6 * (t - 59.35) / 1.8, pan=0.05)
    gap = max(0.045, gap * 0.86)
    t += gap
riser(59.2, 61.2, g=1.0)

# outro chords (resolve) + final hits
pad(61.4, [41 + 12, 57, 60, 64, 67], 2.3, g=1.15, cut=2400, att=0.05, rel=0.6, pan_spread=0.7)
bass(61.4, 41, 2.2, g=1.0, cut=500)
pad(63.7, [45 + 12, 57, 64, 71, 76], 2.8, g=1.1, cut=2200, att=0.05, rel=1.6, pan_spread=0.8)
bass(63.7, 45, 2.6, g=1.0, cut=450)

# ---------------- SOUND DESIGN (synced to motion.html) ----------------
# S1 intro
place(dry, swept_noise(1.2, 400, 3000, bw=1.0) * np.sin(np.pi * np.clip(tt(1.2) / 1.2, 0, 1)) * 0.10, 0.15)
for k, tm in enumerate(np.linspace(0.25, 1.25, 9)):
    bell(tm, mf(76 + [0, 3, 5, 7, 10, 12, 15, 17, 19][k]), g=0.6, pan=-0.6 + k * 0.15, dec=4)
bell(1.0, mf(88), g=0.5, pan=0.4, dec=3)
bell(1.42, mf(81), g=1.0, pan=0, dec=1.6)
impact(1.45, g=0.35, size=0.6)
for i in range(15):
    pluck(1.55 + i * 0.035, [69, 72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96, 98, 100, 103][i], g=0.55, pan=-0.7 + i * 0.1, dec=10)
whoosh(2.55, 0.8, g=0.5, up=False, f_lo=300, f_hi=4000)
sparkle(3.1, 4.4, dens=9, g=0.9)
riser(3.7, 5.12, g=0.9)
rev_cymbal(5.33, 1.3, g=0.9)

# S2 hook (t0 = 5.1)
impact(5.35, g=0.9); clink(5.35, g=0.6, base=1800)
impact(5.85, g=0.8); clink(5.85, g=0.6, base=2000)
impact(6.35, g=1.0, size=1.3); clink(6.35, g=0.7, base=2300)
sparkle(6.7, 7.5, dens=14, g=0.8, lo=88, hi=105)
rumble(5.3, 1.9, g=1.0)
kick(7.0, 0.5)
whoosh(7.25, 1.0, g=0.35, up=True, pan_from=0.8, pan_to=-0.8)
for k, tm in enumerate([7.4, 7.7, 8.0]):
    blip(tm, 1800 + 400 * k, g=0.8, pan=0.5); blip(tm + 0.05, 2400 + 400 * k, g=0.5, pan=0.5)
for k, tm in enumerate([8.1, 8.5, 8.9]):
    pop(tm, 600 + 150 * k, g=0.9, pan=[-0.3, 0.6, 0.0][k]); clink(tm + 0.02, g=0.35, pan=[-0.3, 0.6, 0.0][k])

# transition -> S3 (11.5): impact wrench + whoosh
wrench(11.0, 0.5, g=0.9, pan=-0.3)
whoosh(11.5, 0.9, g=0.8)
whoosh(12.4, 1.4, g=0.5, up=True, pan_from=0, pan_to=0, f_lo=120, f_hi=1800)
kick(12.95, 0.5)
pop(13.2, 900, g=0.9); bell(13.22, mf(88), g=0.4)
typing(13.4, 14.9, cps=22, g=0.8, pan=-0.2)
pop(13.55, 700, g=0.8, pan=-0.6)
pop(15.2, 1000, g=0.9, pan=0.5); bell(15.22, mf(91), g=0.4, pan=0.5)
pop(15.45, 750, g=0.8, pan=0.6)
pop(16.2, 1100, g=0.9, pan=0.2); bell(16.22, mf(93), g=0.4, pan=0.2)
pop(16.45, 800, g=0.8, pan=0.5)

# transition -> S4 (19.2)
whoosh(19.2, 0.9, g=0.8, pan_from=0.7, pan_to=-0.7)
air_hiss(19.25, 0.5, g=0.8, pan=0.4)
whoosh(19.7, 0.7, g=0.4, up=True, pan_from=0.9, pan_to=0.3)
typing(20.1, 21.6, cps=26, g=0.75, pan=0.3)
whoosh(21.8, 0.35, g=0.45, up=True, f_lo=800, f_hi=8000, pan_from=0.4, pan_to=0.6); pop(21.8, 1200, g=0.7, pan=0.4)
blip(22.1, 900, g=0.6, pan=0.3)
for k, (a, c) in enumerate([(22.2, 22.75), (22.6, 23.15), (23.0, 23.55)]):
    blip(a, 700, g=0.4, pan=0.3)
    blip(c, 1320 + 180 * k, g=0.7, pan=0.3); blip(c + 0.06, 1760 + 220 * k, g=0.5, pan=0.3)
typing(23.7, 25.5, cps=30, g=0.28, pan=0.35)
whoosh(25.6, 0.5, g=0.35, up=True, f_lo=500, f_hi=6000, pan_from=0.2, pan_to=0.5)
for k in range(4):
    pop(25.72 + k * 0.18, 650 + 120 * k, g=0.7, pan=0.35)
counter_ticks(26.6, 27.7, 22, g=0.9, pan=0.35)
cash(27.72, g=1.0)
pop(27.65, 900, g=0.6, pan=0.5)
tick(28.8, g=1.2, pan=0.2, f1=1500, f2=5000); pop(28.82, 500, g=0.8, pan=0.2)
success(28.95, g=1.0, root=81)

# transition -> S5 (30.0): wrench + whoosh
wrench(29.55, 0.42, g=0.85, pan=0.3)
whoosh(30.0, 0.9, g=0.8)
tick(30.9, g=1.0, pan=-0.5); tick(31.15, g=1.0, pan=-0.4)
place(dry, np.sin(2 * np.pi * np.cumsum(np.linspace(300, 900, int(0.9 * SR))) / SR) * np.sin(np.pi * tt(0.9) / 0.9) * 0.05, 31.0, -0.5)
for k, (tm, m) in enumerate([(30.9, 69), (31.9, 72), (32.8, 76)]):
    clink(tm, g=0.8, pan=0.3, base=1600 + 300 * k)
    bell(tm + 0.02, mf(m + 12), g=0.6, pan=0.3)
    whoosh(tm + 0.55, 0.5, g=0.3, up=True, f_lo=200, f_hi=2500, pan_from=0.3, pan_to=0.3)
counter_ticks(31.9, 32.4, 8, f0=1500, f1=2000, g=0.7, pan=0.3)
counter_ticks(32.8, 33.3, 8, f0=1700, f1=2300, g=0.7, pan=0.3)
success(33.6, g=0.9, root=84)
blip(33.9, 1100, g=0.4, pan=-0.4)

# transition -> S6 (36.6)
whoosh(36.6, 0.9, g=0.8, pan_from=-0.6, pan_to=0.6)
air_hiss(36.62, 0.7, g=0.9, pan=-0.3)
scanner(36.9, 38.6, g=1.0)
for tm in (37.2, 38.0):
    blip(tm, 1500, g=0.5, pan=-0.5, dur=0.05)
bell(38.1, mf(84), g=0.8, pan=-0.5); bell(38.18, mf(91), g=0.8, pan=-0.5)
whoosh(38.75, 0.5, g=0.4, up=True, f_lo=300, f_hi=4000, pan_from=-0.5, pan_to=-0.5)
for i in range(5):
    place(dry, np.sin(2 * np.pi * np.cumsum(np.linspace(400 + 60 * i, 900 + 80 * i, int(1.1 * SR))) / SR) * np.sin(np.pi * tt(1.1) / 1.1) * 0.025, 37.8 + i * 0.12, 0.4)
    pop(39.1 + i * 0.12, 700 + 110 * i, g=0.6, pan=0.4)
tick(40.0, g=1.2, pan=-0.5, f1=1500, f2=5000); pop(40.02, 500, g=0.8, pan=-0.5)
success(40.15, g=0.85, root=79)
bell(40.9, mf(88), g=0.7, pan=0.5); bell(41.05, mf(93), g=0.7, pan=0.5)

# transition -> S7 (43.2): bright flash into the paper scene
rev_cymbal(43.22, 1.0, g=0.8)
whoosh(43.2, 0.8, g=0.8, up=True, f_lo=600, f_hi=10000)
impact(43.25, g=0.35, size=0.6)
for tm in (43.4, 43.65, 43.95):
    kick(tm, 0.55)
place(dry, swept_noise(1.0, 300, 3000, bw=0.9) * np.sin(np.pi * tt(1.0)) * 0.22, 43.7, -0.7)  # file flight
whoosh(44.7, 0.5, g=0.4, up=False, f_lo=300, f_hi=5000, pan_from=-0.2, pan_to=0.4)
pop(44.2, 1200, g=0.6, pan=0.7)
for k in range(52):
    tm = 44.3 + 2.7 * k / 51
    tick(tm, g=0.35, pan=0.75, f1=1800, f2=3200)
blip(44.82, 1500, g=0.5, pan=0.3)
for k in range(4):
    tm = 44.9 + 0.3 * k
    tick(tm, g=1.1, pan=0.3, f1=1200, f2=4500)
    place(dry, np.sin(2 * np.pi * 110 * tt(0.05)) * np.exp(-tt(0.05) * 80) * 0.3, tm, 0.3)
counter_ticks(46.1, 46.9, 18, g=0.9, pan=0.3)
cash(46.92, g=0.9)
stamp(47.0, g=1.1)
impact(47.0, g=0.4, size=0.8)
for k in range(6):
    pop(47.4 + k * 0.1, 650 + 90 * k, g=0.6, pan=-0.6 + k * 0.08)

# transition -> S8 (49.4)
whoosh(49.4, 0.9, g=0.8)
wrench(49.05, 0.3, g=0.6, pan=0.0)
for k, (tm, p) in enumerate([(49.75, -0.6), (49.9, 0.0), (50.05, 0.6)]):
    whoosh(tm + 0.35, 0.6, g=0.45, up=True, f_lo=150, f_hi=2500, pan_from=p, pan_to=p)
for k, tm in enumerate([50.7, 50.85, 51.0]):
    blip(tm, 1200 + 200 * k, g=0.4, pan=[-0.6, 0, 0.6][k])
place(dry, swept_noise(4.2, 900, 2200, bw=1.6) * np.sin(np.pi * tt(4.2) / 4.2) ** 2 * 0.06, 51.0, 0.0)  # scroll swish
sparkle(51.5, 54.8, dens=2.5, g=0.6)

# transition -> S9 (55.4)
whoosh(55.4, 0.9, g=0.75, up=False, pan_from=0.6, pan_to=-0.6)
air_hiss(55.45, 0.6, g=0.7, pan=0.3)
impact(56.1, g=0.35, size=0.6); clink(56.1, g=0.5)
counter_ticks(56.3, 57.6, 20, f0=1300, f1=2400, g=0.8, pan=-0.2)
counter_ticks(56.5, 57.8, 30, f0=1500, f1=2800, g=0.7, pan=0.2)
impact(56.7, g=0.35, size=0.6); clink(56.7, g=0.5, pan=0.6)
for k in range(4):
    pop(57.15 + k * 0.2, 800 + 100 * k, g=0.5, pan=-0.6 + 0.4 * k)

# S10 outro
impact(61.4, g=1.1, size=1.6); clink(61.4, g=0.8, base=1700)
impact(61.7, g=0.9, size=1.4); clink(61.7, g=0.7, base=2100)
sparkle(61.8, 63.4, dens=8, g=0.8)
for k in range(5):
    pop(62.5 + k * 0.1, 700 + 140 * k, g=0.65, pan=-0.6 + 0.3 * k)
whoosh(63.35, 0.8, g=0.5, up=True)
impact(63.7, g=0.9, size=2.0)
success(63.75, g=0.9, root=81)
sparkle(63.8, 66.0, dens=5, g=0.7)

# ---------------- mix ----------------
# ping-pong delay on arp bus (dotted 8th / 8th)
d1, d2 = int(0.375 * SR), int(0.25 * SR)
arp_wet = np.zeros_like(arpb)
arp_wet[0, d1:] += arpb[1, :-d1] * 0.35
arp_wet[1, d2:] += arpb[0, :-d2] * 0.3
arp_wet[0, 2 * d1:] += arpb[0, :-2 * d1] * 0.15
arp_wet[1, 2 * d2:] += arpb[1, :-2 * d2] * 0.12
arp_mix = arpb + arp_wet
rev += arpb * 0.2

# sidechain: duck pad+bass on every kick
sc = np.ones(N)
kt = []
for a, b in KICK_R:
    k = a
    while k < b:
        kt.append(k)
        k += BEAT
for k in kt:
    i = int(k * SR)
    seg = tt(0.42)
    duck = 1 - 0.55 * np.exp(-seg * 9)
    sc[i:i + len(seg)] = np.minimum(sc[i:i + len(seg)], duck[: N - i])
music = hp(music_sc * sc, 45) * 0.62

# reverb: synthetic stereo hall IR
irn = int(2.6 * SR)
it = np.arange(irn) / SR
ir = np.stack([lp(rng.standard_normal(irn), 6000) * np.exp(-it * 2.6), lp(rng.standard_normal(irn), 6000) * np.exp(-it * 2.6)])
ir[:, : int(0.012 * SR)] = 0
ir /= np.sqrt(np.sum(ir ** 2, axis=1, keepdims=True))
wet = np.stack([fftconvolve(rev[0], ir[0])[:N], fftconvolve(rev[1], ir[1])[:N]])

mix = dry + music + arp_mix * 0.9 + wet * 0.5
mix = hp(mix, 28)
# gentle glue + soft limit
mix = np.tanh(mix * 0.8) / np.tanh(0.8)
# fade tail
end = int(DUR * SR)
fade = int(1.4 * SR)
mix[:, end - fade:end] *= np.linspace(1, 0, fade) ** 1.5
mix[:, end:] = 0
mix = mix[:, :end]
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 0.89

out = sys.argv[1] if len(sys.argv) > 1 else 'soundtrack.wav'
pcm = (mix.T * 32767).astype(np.int16)
import wave
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('wrote', out, mix.shape, 'rms dBFS', 20 * np.log10(np.sqrt(np.mean(mix ** 2)) + 1e-9))
