# Sheave

**A tackle never makes the load lighter. It hangs the load from more parts of
the rope at once, so the end you haul carries only its share — and you pay for
it in the rope you pull through.**

A *sheave* is the grooved wheel inside a block that a rope runs over. Reeve a
rope down through a fixed block and up through a moving one, back and forth, and
the load hung on the moving block is held by several parts of line at the same
time. Each part carries an equal share of the weight, so the last part — the
*fall*, the end in your hands — carries only that share. Count the parts running
to the moving block: that number is the purchase. Not the blocks, not the
sheaves — the parts. Six parts, and a pull of fifty holds three hundred.

It is never free. To raise the load a foot, every part must shorten by a foot,
so on a six-part tackle you haul six feet of rope. Force is bought with
distance, at a fixed rate, and the sheaves only decide how much of the ideal the
friction lets you keep.

## The one price

- **Ideal effort = load ÷ parts.** The velocity ratio — rope hauled per length
  lifted — is the same number.
- **Friction taxes it.** Each sheave the rope bends over passes on only a
  fraction of the tension, so a real tackle needs a little more than *load ÷
  parts*, and each extra part gains a touch less than the last.
- **You can run out.** When the blocks come together — *two-blocked* — there
  are no more parts to reeve; the load stops there whether it is home or not.

The physics on the bench is the standard one. With N parts and a per-sheave
efficiency `e`, the parts carry tensions `P, Pe, Pe², … Pe^(N−1)`, so the load
is their sum and the pull on the fall is

```
P = W · (1 − e) / (1 − eᴺ)
```

and the tackle's real efficiency is `η = (1 − eᴺ) / (N·(1 − e))`. Greased blocks
take `e ≈ 0.98`; fair, `0.955`; stiff and salted, `0.90`.

## The bench

One tackle in schematic — a fixed block, a moving block, the load hung on it.
Set the **parts** you reeve, the **load**, and the **state of the blocks**. The
page shows the pull on the fall, the purchase and velocity ratio, the efficiency
you are actually keeping, and the rope per metre of lift, and lights the
**within-reach band** — the span of effort one person can hold and haul.

It opens on a quarter-tonne under-rove on stiff blocks, the fall far too hard to
hold. **Reeve to advantage** adds parts until it comes within reach — and when
the parts run out, the lesson is the one the sailor already knows: grease the
blocks. A fair three-part tackle beats a foul six.

*Part of [Purchase](../) — three parallel ideas on turning a small, steady
effort into a large one. 2026-08-01.*
