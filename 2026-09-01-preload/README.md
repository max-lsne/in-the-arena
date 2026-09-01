# Preload

**Three small pages, made the same morning, for the one law that runs
through three trades: put the join in tension before the load arrives, so
the working load only ever eats into the preload and never reaches the
point where the joint lets go. Load it hard, on purpose, first.**

Most days in this folder are one page. Some mornings the idea comes in
threes. A join fails when it is finally pulled apart — a stave-seam
opened, a spoke gone slack, a stay gone dead — and the oldest way to keep
that from ever happening is not to make the join stronger but to **spend
its danger in advance**. Set the thing hard against itself before the
world gets to it: drive the hoops, shrink the tyre, harden the
bottlescrews. Now the join begins its life already loaded, and the worst
the world can do is load it a little *less*. These three started in
different trades — a cask, a cartwheel, a mast — and they meet here,
because they are all saying the one thing in three materials.

## The three

- **[Barrel](./barrel/)** — *the join in a cask.* Stand the staves in a
  ring and they clatter to the floor; there is nothing between them but a
  planed edge, and a planed edge in tension is the weakest thing there
  is. So the cooper drives the hoops — iron rings cut a shade too small —
  until every seam is squeezed shut before a drop is poured. Fill the
  cask and the wine's pressure only eats into that squeeze; the seam
  stays watertight until the load finally cancels the preload, and if the
  hoops were driven hard enough, that never comes. A page for the work you
  make watertight at the bench, so it never leaks at the waterline.

- **[Wheel](./wheel/)** — *the join in a cartwheel.* A spoke is only
  *pushed* into its mortise, and a mortise ever allowed to go loose
  begins to hammer itself to pieces. So the wheelwright shrinks an iron
  tyre on hot, and shrinking it crushes the whole wheel inward, jamming
  every spoke home under a great compression before the cart rolls. The
  load comes down through the hub and, at the bottom of the wheel, comes
  straight off that compression — a spoke is *unloaded, never pulled
  slack*, and never rattles. A page for answering a whole life of
  pounding once, at the fire, and letting the road only relax what you
  drove tight.

- **[Shroud](./shroud/)** — *the join in a rig.* A mast stands not
  because a wire holds it up but because two wires hold it from both
  sides at once, each set up taut against the other before the wind
  blows. A gust adds to the windward shroud and takes from the lee — but
  the lee only ever slackens *toward* zero, never through it, so the mast
  is never let go on one side to snap to and pump at its step. A page for
  keeping tension in the thing you rely on, so it is never once caught
  slack when the load comes on.

## The one law

All three trades learned the same thing, and none of them from each
other. Model any one of these joins as two springs pulling against each
other — a **fastener** in tension (the hoop, the tyre, the windward wire)
and a **body** in compression (the staves, the spoke, the mast) — both
set to the same preload `F₀` when the thing is made up. Now the world
adds an external load `P`. It does not all fall on the seam, because the
two share the give: only a fraction `φ` reaches the fastener, and the
rest is *subtracted from the preload*.

- The fastener tightens a little: **`F_fastener = F₀ + φ·P`** — so it
  barely feels the load's endless flutter, and barely fatigues.
- The preload bleeds away: **`F_join = F₀ − (1−φ)·P`** — the number that
  holds the join, and the one that runs out.
- The join lets go when the preload reaches zero: **`P_sep = F₀/(1−φ)`**.
  Below it, the join is shut and the body never sees a tensile pound. At
  it, the contact lifts.

Two lessons live in those three lines, and all three pages are built to
show them. The **preload** `F₀` sets how much load the join can swallow
before it opens — spend more at the bench, hold more under load. And the
**split** `φ` sets how much of the load's flutter the fastener has to
feel — a giving fastener against a stiff body keeps `φ` small, so the
preload takes the beating, which compression can bear forever. You do not
keep a join from failing by waiting to catch the load. You keep it by
loading it first, hard, so that when the load comes there is nothing left
for it to break.

It is the same discipline the [seam](../2026-08-24-seam/) knows about
lapping a join over a length instead of a line, the
[purchase](../2026-08-01-purchase/) knows about setting up a tackle
before the strain comes on, and the [holdfast](../2026-05-22-holdfast/)
knows about gripping harder the harder it is pulled. Load it first.

## What's here

Three folders, each a self-contained page — one HTML file, one
stylesheet, one script, no build and no network once it has loaded. Each
carries the same interactive bench worked in its own trade: drive the
hoops, shrink the tyre, or set up the rig; then fill, load, or gust it,
and read the joint diagram as the preload bleeds away and the separation
point comes near. Open any `index.html` in a browser.

*One of a series — a page a day, each built on one old working word and
the discipline hidden inside it. Some mornings, three. 2026-09-01.*
