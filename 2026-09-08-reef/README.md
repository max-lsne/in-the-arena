# Reef

**A sail is the one engine you cannot make stronger — only smaller. The push
the wind lays on it grows with the *square* of the wind, so a breeze that
doubles hits four times as hard, and there is no throttle to ease. The only
thing in the sailor's hands is the sail's own area, and to *reef* is to take a
tuck in it and roll part away. Reef in time and the boat stays in its groove,
heeled to the angle it was drawn for and driving hard; leave it too late and
the same wind lays the rail under and the helm goes heavy and useless. The
decision is set by one balance: the wind's heeling moment against the hull's
own righting moment, and the heel angle where the two agree.**

The word is old and northern — a *reef* is a rib or ridge, from Old Norse
*rif*, and a sail is reefed by gathering it rib by rib along the reef band and
tying it down. Every working rig from a dinghy to a square-rigger carries the
same secret the hand learns before the deck does: you do not fight a rising
wind, you subtract sail from it. The boat did not change and the ballast did
not change — but the wind rose, the push climbed with its square, and the one
answer is to give the wind less to push on.

## The one relation

Hold a boat upright and let the wind press on the sail. The heeling moment it
lays on, and the righting moment the hull answers with, meet at one heel angle:

- **The heeling moment** — `M_h = ½ρ · A · C · V² · h · cos²θ`. Air density
  `ρ`, sail area `A`, a force coefficient `C`, the wind `V` *squared*, and the
  height `h` of the sail's centre of effort above the water. It falls off as
  `cos²θ` as the boat heels and the rig lies over — but it climbs with `V²`,
  and that is the term that runs away from you.
- **The righting moment** — `M_r = Δg · GM · sinθ`. The boat's weight `Δg`
  times the metacentric height `GM` — how stiffly the hull stands up — times
  `sinθ`. This is all the boat has to answer with, and past a point it stops
  growing and starts to fall: that is where the rail goes under.
- **The balance** — set them equal, `M_h = M_r`, and the steady heel comes out
  in closed form. Writing `R = M_h0 ⁄ (Δg·GM)` for the ratio at upright,
  `sinθ = (√(1 + 4R²) − 1) ⁄ 2R`. Small `R`, small heel; as the wind climbs,
  `θ` walks toward the angle where the deck edge kisses the sea.

Reefing is the one move that reaches into `M_h` and pulls it down: less `A`,
and a lower centre of effort `h` as the head of the sail comes down, so the
heeling moment drops faster than the area alone. The wind is unchanged; you
have simply given it less lever and less cloth, and the balance settles back to
a heel the hull can carry all day.

## The bench

One boat seen bow-on, heeling to the wind: the **hull** and its ballast, the
**mast** and the **sail**, the **waterline**, and the arc of the **heel angle**
it settles to. Pick the **boat** — a stiff catboat, a modern sloop, a small
keelboat, or a tender gaffer, each standing up to the wind differently — set
the **wind** and take in the **reef**, notch by notch, and watch the boat come
upright as the sail comes down. The gauge reads the heel against the boat's
**groove** and the **rail-under** wall beyond it. Press *Find the reef* to set
the sail that lands the boat back in its groove for the wind it is blowing. The
numbers are the real ones: the balance `sinθ = (√(1+4R²)−1)/2R`, the sail area
carried, the heeling moment, and the wind at which this sail would bury the
rail.

Each page is one HTML file, one stylesheet, one script. No build, no account,
no network once it has loaded. The four boats' stability and rig numbers are
stylised — plausible, not measured — but the mechanics drawn from them are
exact.

*One of a series — a page a day, each built on one old working word and the
discipline hidden inside it. 2026-09-08.*
