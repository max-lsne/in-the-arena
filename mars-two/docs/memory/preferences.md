# How the work is done

## Evidence

A claim of completion requires evidence from the session it was claimed in: a
test run, a diff, a probe. "Should work" is not a result.

Every gate is verified by breaking what it guards. A test that has never failed
has not been shown to test anything. This has caught four tests in this repo that
passed with the logic inverted.

## Design

If correctness depends on a model choosing to do something every time, it will
fail intermittently. Move must-happen behaviour into code.

Never let a model count, compare numbers, or do arithmetic. Precompute into
explicit lookups.

Test properties, not phrasings.

## Writing

Spartan and informative. Short sentences. Sentence case in the interface. No em
dashes anywhere. No "just", "simply", "powerful", "seamless", "leverage",
"delve", "landscape", "testament", "in conclusion". No praise of the work in the
work. No "you're right".

Commit messages say what was wrong and what now catches it, not what was added.

## Build log

`docs/log/` carries every defect found, numbered, each with what failed, why
nothing caught it, and what catches it now. That file is the point of the
exercise as much as the code is.
