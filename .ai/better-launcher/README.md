# Better Launcher Research And Plan

Research date: 2026-05-11

This folder captures research on Prism Launcher and GDLauncher Carbon, then turns
that benchmark into a concrete plan for making Nyxen a better Minecraft launcher.

## Folder Structure

```text
.ai/better-launcher/
  README.md
  research/
    prism-launcher.md
    gdlauncher-carbon.md
    benchmark-matrix.md
  strategy/
    product-plan.md
    differentiators.md
  architecture/
    recommended-file-structure.md
    service-design.md
  roadmap/
    mvp-to-v1.md
    phase-0-foundation-audit.md
```

## How To Read This

1. Start with `research/benchmark-matrix.md` for the side-by-side view.
2. Read `strategy/product-plan.md` for the product direction.
3. Use `architecture/recommended-file-structure.md` when planning code changes.
4. Use `roadmap/mvp-to-v1.md` to turn the plan into implementation milestones.
5. Use `roadmap/phase-0-foundation-audit.md` for the current launch-plan,
   install-path, drift, and recipe-schema baseline.

## Summary

Prism Launcher wins on maturity, openness, performance, pack-source breadth, and
power-user control. GDLauncher Carbon wins on modern UX, automation, Java
management, instance sharing, and integrated server management.

Nyxen should aim for a third lane:

- Local-first and ownership-verified like the current Nyxen foundation.
- Lightweight and transparent like Prism.
- Guided, modern, and automated like GDLauncher Carbon.
- Better troubleshooting than both, with first-class diagnostics, repair plans,
  dependency explanations, and shareable support bundles.
- Better collaboration than both, with reproducible instance recipes, friend
  join flows, server pairing, and privacy-aware sync that is optional.

The north star: Nyxen should feel like a launcher that understands what the user
is trying to do, not just a file manager for instances.
