# Sympathy

**Three small pages, made the same morning, for the one law that runs
through three trades: a thing has a rhythm of its own, and a push that
arrives on that rhythm — however small — is kept and added to the last,
until a hold anyone could supply raises a swing nobody could. Match the
beat, not the muscle.**

Most days in this folder are one page. Some mornings the idea comes in
threes. A ringer raises a half-ton bell on a rope a child could pull, a
singer bursts a glass with a held note, a footbridge is closed by the
weight of a crowd merely walking — three trades that never met, and every
one of them leaning on the same fact about a thing that swings. Everything
that can swing has a **natural frequency** it settles to when struck and
left alone. Drive it at that frequency and each little push lands in step
with the last, so the pushes add instead of fighting, and the swing climbs
far past anything a single push could reach. Drive it off that frequency
and the pushes quarrel — one shoves while the swing is still coming back —
and it stays where it was. The whole of it is *when*, not *how hard*.

## The three

- **[Bell](./bell/)** — *build.* A tower bell weighs more than the ringer
  and swings a full turn, yet it is raised on a rope pulled by one pair of
  hands — because each pull is timed to the bell's own slow stroke, and a
  hundred timed pulls stack into a peal. A page for the great thing you
  cannot shove but can **build**, a small push at a time, if every push
  lands on the beat.

- **[Glass](./glass/)** — *break.* A wine glass has one note, and a voice
  that holds exactly that note pours energy into the rim faster than the
  glass can shed it, until the rim flexes past what it can bear and it
  bursts — while the same voice a tone away does nothing at all. A page for
  the input that **breaks** a thing not by being loud but by *matching* it:
  the right key, not the heavy one.

- **[Bridge](./bridge/)** — *brace.* A footbridge sways a little under a
  crowd; the sway tips each walker's stride into its rhythm; the matched
  strides feed the sway, which tips more walkers — and a bridge nobody
  meant to drive drives itself to a standstill. You cannot ask a crowd to
  break step, so you raise the floor: fit dampers that bleed the swing away
  faster than the crowd can feed it. A page for the accidental match you
  must **brace** against, on the one dial you actually hold.

## The one law

All three trades learned the same thing, and none of them from each other.
A thing that can swing — a bell on its gudgeons, a glass rim, a bridge
deck — answers a steady push of frequency `f` by settling to a swing whose
size is the size a slow push would give, multiplied by a gain that turns
entirely on two numbers:

- **`r = f ⁄ f₀`** — how near your push is to the thing's own natural
  frequency `f₀`. At `r = 1` you are exactly on its beat.
- **`Q`** — how freely it swings: how many cycles it keeps going after you
  stop. A high `Q` swings long and cleanly.
- **`gain = 1 ⁄ √((1 − r²)² + (r ⁄ Q)²)`** — the amplification. On the beat
  (`r = 1`) it rises to about **`Q`**: a thing that rings for a thousand
  cycles will swing a thousandfold. Off the beat it collapses toward one.

Two lessons live in that one line, and all three pages are built to show
them. The **beat** `r` is the thing you can miss by a hair and lose
everything — the peak is narrow, about `1 ⁄ Q` wide, so a freely-swinging
thing that amplifies enormously is also the hardest to hit and the easiest
to walk straight past. The **freedom** `Q` is what decides both how tall
the peak stands and how narrow: the same quality that lets a bell ring up
lets a crystal glass shatter and a slender bridge run away, and the only
sure cure for a swing you don't want is to spend that freedom — to damp it,
dropping `Q` until the gain has nowhere to climb. You do not raise a great
swing by pushing hard. You raise it by pushing in time — and you kill one
the same way you would kill a fire: not by pushing back, but by taking away
the air it climbs on.

It is the same discipline the [governor](../2026-08-15-governor/) knows
about a swing that finds its own level, the [escapement](../2026-07-30-escapement/)
knows about feeding a pendulum one timed nudge a beat, and the
[capstan](../2026-09-04-capstan/) knows about a small hold standing against
a great load. Match the beat.

## What's here

Three folders, each a self-contained page — one HTML file, one stylesheet,
one script, no build and no network once it has loaded. Each carries the
same interactive bench worked in its own trade: set the beat, the drive,
and the freedom, and watch the thing swing up to its settled size, coloured
by how near it stands to its limit, while a resonance curve plots the gain
against frequency and marks where your push falls. Open any `index.html` in
a browser.

*One of a series — a page a day, each built on one old working word and the
discipline hidden inside it. Some mornings, three. 2026-09-16.*
