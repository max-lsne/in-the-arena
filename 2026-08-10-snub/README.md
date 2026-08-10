# Snub

**A rope under tons of load can be held by a finger — if it takes a few turns
round a post first. The turns do not add to your pull; they multiply it, and
the multiplier climbs exponentially with the wrap. Loop a line once round a
bollard and the post carries some of the load; loop it again and the post
carries the same share again, of what is left, because each wrap sheds the
same fraction of the tension into friction against the wood. Add the fractions
up around the whole wrap and you get one of the oldest exact results in
mechanics — the *capstan equation*: the loaded tension and the tension you must
hold on the tail stand in the ratio e^(μθ), where θ is the whole angle the rope
wraps and μ is how the rope grips the post. It is blind to the size of the rope
and the size of the post. Euler wrote it down; every deckhand knew it in the
hand. Three turns of hemp on an oak bitt hold a barge against the tide on two
fingers — and the same exponent that lets a finger hold her means a finger can
never haul her back, because friction does not care which way you pull.**

The word *snub* is the sailor's and the teamster's: to snub a line is to check
it by taking a turn round a post, letting the friction of the wrap do the
holding a bare hand never could. You snub before you strain — take the turns
first, let the post take the ship, and only then put a hand to the tail.

## The one shape

Follow the rope round the post and watch the tension fall away. Because every
degree of wrap sheds the same *fraction* of what passes through it, the tension
decays as a compound discount — a straight line on a logarithmic scale, the
exponential seen edge-on — and everything the wrap can do falls out of where
that line lands:

- The **holding power** the wrap supplies is e^(μθ): a half turn on wood is
  worth near ×3, a full turn near ×9, three turns near ×700. The load it will
  hold at a given hand is that ratio times the hand; the hand a load demands is
  the load divided by it.
- The line **holds** while the tail lands on or below the reach of the hand you
  have, and **renders** — runs round the post in a rush — the moment the load's
  slack-side demand climbs above it. The margin between the two is not force but
  **turns**: when a line is close to running you throw another turn, and the
  exponent does the rest.

The page is one line round one bitt, seen from above: the load comes in on the
standing part, wraps the post, and leaves as a tail in your hand. Set the
**load**, the **grip** between rope and post, and the **turns**, then choose the
**hand** on the tail — a finger, a hand, or a full heave. It reads back the
holding power, the load the wrap will hold, the hand the load would need, and
the turns it takes to bring the load down to your hand, and it lights green
while the line holds and red when it renders. The numbers are the real ones: the
hold is the capstan equation T_load = T_hand · e^(μθ), after Euler; the tension
round the post is L·e^(−μφ), and the turns needed to hold a load L on a hand H
are ln(L/H) / (2π·μ). Loads are quoted as weight; μ runs from a greased sheave
to tarred hemp on rough oak.

Each page is one HTML file, one stylesheet, one script. No build, no account,
no network once it has loaded.

*One of a series — a page a day, each built on one old working word and the
discipline hidden inside it. 2026-08-10.*
