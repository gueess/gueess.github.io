# Project Working Agreement

This repository is Joe's public photography website. The user owns the
photographs, written content, and final layout decisions. The agent owns the
implementation, validation, Git history, deployment, and release checks.

## Branch lifecycle

- Treat one coherent body of work as one long-lived feature branch, not one
  branch per chat, edit, or commit.
- Create feature branches from the latest `main` and name them
  `codex/<workstream>`, for example `codex/shanxi-gallery`.
- Keep every related change on that branch until the complete workstream is
  approved, merged, deployed, and verified. For a gallery, this includes photo
  imports, sequencing, captions, layout iterations, and fixes discovered while
  preparing that gallery.
- When continuing an existing workstream in a later conversation, reuse its
  existing branch. Do not create a replacement branch merely because a new
  session started.
- Put unrelated work on a separate branch. An urgent production fix must not be
  mixed into an unfinished gallery branch.

## Commits and safety

- Keep `main` deployable and reserve it for completed work.
- Make meaningful checkpoint commits on the feature branch and push the branch
  regularly so unfinished work is backed up remotely.
- Before staging, inspect the worktree and preserve user-owned or unrelated
  changes. Stage only files belonging to the active workstream.
- Never rewrite shared history or use destructive Git commands unless the user
  explicitly requests them.

## Completion and release

- Do not merge an unfinished workstream into `main`.
- When the user confirms the work is ready to publish, run the relevant content
  validation, type checks, production build, and proportional UI checks.
- Push the completed feature branch, then merge it into `main` with a merge
  commit (`--no-ff`) so the workstream remains visible in Git history. A pull
  request may be used when available, but the preserved merge record is
  mandatory.
- Push `main`, wait for the GitHub Pages workflow, and verify the public site.
- Delete a merged feature branch only after the deployment is confirmed; its
  commits and merge record must remain reachable from `main`.

## Default responsibility

The agent handles branch creation and reuse, commits, pushes, merging,
deployment, and verification. The user should not need to perform Git actions
unless they explicitly choose to review or merge a particular workstream.
