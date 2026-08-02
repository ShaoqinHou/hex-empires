# Density evidence artifacts

This directory stores accepted output from the versioned density benchmark. The
workload definition is embedded in every report and implemented in the portable
`@hex-empires/scenario-density` workspace. The Node-only measurement host lives
in `@hex-empires/benchmark-density`.

`results/` is intentionally tracked. Result filenames identify the source
revision and environment; the CLI refuses accidental overwrite. Raw durations
remain in each JSON report so median and p95 values can be recomputed without
trusting a prose summary.

A result is eligible for architectural guidance only when its own validator
accepts the complete matrix and records a clean source revision. Smoke, partial,
dirty, and locally modified reports remain diagnostic evidence, not baselines.
