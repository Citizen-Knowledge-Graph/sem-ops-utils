// Aggregate entry point — re-exports every public symbol so legacy consumers
// importing from "@foerderfunke/sem-ops-utils" keep working unchanged. New
// consumers should prefer the submodule entries ("/core", "/sparql", "/shacl",
// "/jsonld") to avoid pulling in heavy deps they don't use.
export * from "./core.js"
export * from "./sparql.js"
export * from "./shacl.js"
export * from "./jsonld.js"
