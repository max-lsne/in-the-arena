# Glass

*One of three for [sympathy](../) — the day's idea seen from three sides.
This is the **break** side: the input that breaks a thing not by being loud
but by matching it.*

A wine glass rings at one clear **note**, fixed by its bowl. Hold a steady
tone on that exact note and the rim answers, flexing round-to-oval at the
tone's pitch; because good glass sheds its ringing slowly, each cycle banks
a little more flex than the last one shed, and the oval grows far past what
the tone's loudness could push it in a single shove — until the silica
flexes past its breaking strain and the glass bursts. Sing a tone even a
little off the note and nothing happens: the pushes fall out of step. Not
the loudest input, the matched one.

## The one line

Let the tone's pitch be `f` and the glass's note `f₀`, with `r = f ⁄ f₀`,
and let `Q` be the glass — how many cycles it rings on after a tap. The
settled flex is the flex a slow push would give, times the gain:

```
gain = 1 / √((1 − r²)² + (r ⁄ Q)²)
```

On the note (`r = 1`) the gain rises to about `Q`; the peak is only about
`1 ⁄ Q` wide, so a fine crystal flexes further *and* demands the tone sit
more exactly on the note. Loudness only scales what the match has won.

## Four states

- **Silent** — off the note or too soft; the pushes cancel and the rim
  barely stirs.
- **Rings** — near the note, singing back the pitch, well within its
  strain: the sympathetic answer, and safe.
- **Strains** — dead on the note and loud; the flex has climbed near the
  breaking strain, humming and blurred.
- **Shatters** — the flex passes the strain the silica can bear and the
  bowl bursts — on a matched note, no great loudness needed.

## The bench

Set the **pitch** of the tone against the glass's note of 660 Hz, the
**loudness**, and the **glass** itself — thick tumbler to thin crystal. The
rim flexes round-to-oval to the depth the match wins, coloured as it nears
the strain; a resonance curve plots the gain against pitch; a gauge reads
the flex against the breaking strain. *Find the note* tunes the tone onto
the glass's pitch.

Pure HTML, CSS, and JavaScript — no build, no network once loaded. Open
`index.html` in a browser. The glass's note, wall and strain are stylised,
and the ring `Q` is drawn far lower than real crystal so the curve reads on
the page; the gain and flex are exact. 2026-09-16.
