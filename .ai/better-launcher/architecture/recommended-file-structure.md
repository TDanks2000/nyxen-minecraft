# Recommended File Structure

Research date: 2026-05-11

This is a proposed structure for growing the current Nyxen codebase toward the
product plan. It keeps the existing Bun backend, shared RPC schema, React view,
and local SQLite direction.

## Documentation Structure

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
```

## Application Structure

```text
src/
  bun/
    launcher/
      accounts/
        auth-service.ts
        entitlement-service.ts
        profile-health.ts
      catalogs/
        curseforge-provider.ts
        modrinth-provider.ts
        provider-contract.ts
      downloads/
        download-queue.ts
        hash-verifier.ts
        retry-policy.ts
      instances/
        instance-repository.ts
        instance-recipes.ts
        instance-snapshots.ts
        instance-updates.ts
      java/
        java-index.ts
        java-installer.ts
        java-selector.ts
      launch/
        launch-plan.ts
        launch-runner.ts
        launch-state.ts
        missing-artifacts.ts
      mods/
        dependency-graph.ts
        compatibility.ts
        mod-resolver.ts
      repair/
        repair-actions.ts
        repair-classifier.ts
        support-bundle.ts
      servers/
        server-repository.ts
        server-recipes.ts
        server-runner.ts
        server-backups.ts
      storage/
        data-paths.ts
        file-locks.ts
        metadata-cache.ts
    db/
      schema/
        accounts.ts
        downloads.ts
        instances.ts
        recipes.ts
        servers.ts
      migrations/
    rpc/
      handlers/
        accounts.ts
        catalogs.ts
        downloads.ts
        instances.ts
        launch.ts
        repair.ts
        servers.ts
      router.ts
  shared/
    rpc/
      schema.ts
    launcher/
      accounts.ts
      catalogs.ts
      downloads.ts
      instances.ts
      java.ts
      launch.ts
      repair.ts
      servers.ts
  views/
    main/
      features/
        accounts/
        catalog/
        downloads/
        instances/
        launch-plan/
        repair-center/
        servers/
        settings/
      lib/
        rpc.ts
        date-format.ts
        file-url.ts
```

## Why This Structure

- `accounts`: keeps Microsoft/Minecraft auth and ownership health separate from
  instance logic.
- `catalogs`: isolates provider-specific rules, rate limits, API terms, and
  metadata shapes.
- `downloads`: centralizes concurrency, retries, hashing, and blocked-download
  states.
- `instances`: owns local instance records, recipe revisions, snapshots, and
  update history.
- `java`: makes runtime detection, install, and selection testable.
- `launch`: owns launch planning and execution, not UI state.
- `mods`: owns dependency resolution and compatibility checks.
- `repair`: turns launch/download/log failures into classified actions.
- `servers`: treats server profiles as first-class but distinct from client
  instances.
- `storage`: keeps file-system paths, locks, and cache policy out of feature
  services.

## File Naming Rules

- Use domain nouns for durable services: `instance-repository.ts`,
  `java-selector.ts`, `launch-plan.ts`.
- Use `*-provider.ts` for external catalog implementations.
- Use `*-contract.ts` for provider interfaces.
- Use `*-runner.ts` for long-running process orchestration.
- Use `*-classifier.ts` for diagnostic categorization.
- Keep UI feature folders aligned with backend domains where possible.

## Data Model Additions

Add tables or typed records for:

- Recipe revisions.
- Snapshot metadata.
- Java runtime inventory.
- Download artifacts and hashes.
- Provider file metadata.
- Launch attempts.
- Repair suggestions.
- Server profiles.
- Support bundle exports.

## Migration Strategy

1. Keep existing paths working.
2. Introduce contracts around current services before moving files.
3. Add recipe/snapshot records next to existing instance records.
4. Move provider-specific logic behind catalog provider interfaces.
5. Add launch plan persistence before adding the repair center.
6. Add server profiles only after client recipe metadata is stable.

