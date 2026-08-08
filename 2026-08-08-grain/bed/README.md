# Bed

**Sedimentary stone was laid down in beds, and it must go back into the wall the
way it lay in the ground — on its natural bed, load across the layers. Turn it
face-bedded, the layers parallel to the weather, and frost gets between them and
sheds the face off in sheets.**

A block of sandstone or limestone is not one solid thing. It is a stack of beds —
layers of sediment pressed and cemented over ages, strong across their thickness
and weak between one layer and the next, exactly like the grain of wood. A mason
can turn that block any way, and only one way is right: it must sit the way it
lay in the ground, beds level, the wall's weight pressing them shut and rain
running off the top of each course. Turn it face-bedded — beds standing vertical
and parallel to the wall face — and every layer is a mouth open to the sky. Water
seeps into the bed-ends, a frost turns it to ice, ice is larger than water, and it
jacks the layers apart until the face *spalls*, shedding whole sheets a bed thick,
carving and all, while the stone beside it laid right stands another five hundred
years.

## The one reading

Nearly always the rule is plain: lay it on its natural bed. But the reading turns
around where the stone must stand. A cornice, a cill, a coping — any stone
throwing water off a horizontal top — is laid *edge-bedded*, beds on end running
front-to-back, because natural bedding there leaves the layers flat under the
weather and the frost peels them from above. So there is a working country with a
wall on each side:

- **Beds open to the weather — it spalls.** Water sits in the exposed layers,
  freezes, and lifts the face off in sheets. Fast, and total.
- **Beds square to the weather — it weathers true.** Water crosses the beds and
  sheds, the wall's weight holds them shut, and the stone frets only slowly at the
  surface, keeping its line for centuries.

And the width of that country is the stone's to give: a dense granite drinks
almost nothing and forgives a careless setting; a thirsty sandstone laid wrong in
a wet, freezing place will spall in a few winters. The cure is not a harder stone
in the same setting — it is turning the beds to shed, and, where the weather is
worst, choosing a stone that does not drink.

The bench uses a frost model directly:

```
trap = cos²β          purchase = 0.04 + 0.96·trap
years = base / (freezes · wet · drink · purchase)
```

where `β` is the bed to the weather — 0° face-bedded, 90° square-on — and `base`,
`drink` are the stone's durability and thirst.

## The bench

One ashlar in the face of a wall, in section, with a season running wet to
freezing over it. Set the **lie of the beds**, the **weather** of freeze-thaw
cycles a winter, the **wet** that reaches it, and the **stone**. The page shows
the water an open bed holds, the frost's purchase, and the years before the face
begins to spall, and lights the **sound band**.

It opens on a thirsty sandstone set nearly face-bedded on a soaked, hard-freezing
coping — shedding in a handful of winters. **Turn the bed to shed** — and watch
the years run out to centuries.

*Part of [Grain](../) — three parallel ideas on the direction hidden in a worked
material. 2026-08-08.*
