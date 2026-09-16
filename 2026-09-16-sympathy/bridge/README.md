# Bridge

*One of three for [sympathy](../) — the day's idea seen from three sides.
This is the **brace** side: the accidental match you cannot move and must
defend against, on the one dial you actually hold.*

A slender footbridge has a natural sideways **sway**, and a crowd crossing
it delivers a small sideways push each step. Usually those pushes cancel —
but once the deck sways enough to be felt, walkers plant their feet *with*
it to keep their balance, and a foot planted against a sway pushes back in
time with it: the exact push that feeds it. The matched strides grow the
sway, the sway pulls in more walkers, and a bridge nobody meant to drive
drives itself — as London's Millennium Bridge did on opening day. You
cannot ask a crowd to break step, so you raise the floor: fit dampers that
drink the sway faster than the crowd can feed it.

## The one line

Let the crowd's step be `f` and the deck's sway `f₀`, with `r = f ⁄ f₀`, and
let `Q` be the deck's freedom — how many sways it keeps after a nudge, which
the dampers set. The settled sway is the sway a slow lean would give, times
the gain:

```
gain = 1 / √((1 − r²)² + (r ⁄ Q)²)
```

You cannot move the peak — the step and the sway are both fixed. But you can
lower it by cutting `Q`: fit dampers, and the gain has nowhere to climb.
This is the mirror of the bell and the glass, where a high `Q` was the
prize; here it is the hazard.

## Four states

- **Steady** — damped enough; the sway stays below what a walker notices.
  Braced, not lucky.
- **Sways** — felt underfoot; walkers begin to step with it. The loop has
  started to turn.
- **Locks in** — much of the crowd stepping with it, pumping hard; a
  mechanism running away, a hair from the limit.
- **Runs away** — past the safe limit; the crowd locked to it, the span
  closed. No plea to the crowd brings it back — only the floor.

## The bench

Set the crowd's **step** against the deck's sway of 60 a minute, the
**crowd** on the span, and the **dampers** fitted. The deck bows sideways to
the width the crowd wins, coloured as it climbs toward the limit; a
resonance curve plots the gain against step (with the bare-deck curve behind
it, so the dampers' effect reads); a gauge reads the sway against comfort
and the limit. *Fit the dampers* raises the damping until the deck holds
steady — the one cure you control.

Pure HTML, CSS, and JavaScript — no build, no network once loaded. Open
`index.html` in a browser. The deck's sway, span and limit are stylised,
and the crowd's self-driving feedback is sketched, not solved; the gain and
sway drawn from them are exact. 2026-09-16.
