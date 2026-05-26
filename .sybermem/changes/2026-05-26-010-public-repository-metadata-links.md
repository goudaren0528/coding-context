---
type: change
date: 2026-05-26
number: 010
title: public-repository-metadata-links
status: implemented
author: claude
related_files: package.json, README.md
---

## Change Content

Connected `ctx`'s public package and documentation metadata to the real GitHub repository.

This follow-up included:
- added `repository`, `homepage`, and `bugs` fields in `package.json`
- updated the README clone command to use `https://github.com/goudaren0528/coding-context.git`
- updated README repository and issue links to the same GitHub project

## Reason for Change

The initial public-release preparation deliberately left repository URLs conservative because this repository did not yet have a confirmed public GitHub address available in-session.

Once the real GitHub repository was provided, package metadata and README install instructions needed to be aligned so users and future npm consumers could find the canonical source and issue tracker.

## Impact Scope

- npm metadata now points to the real public repository
- README install instructions now use the real clone URL
- README repository navigation now points to the real source and issue tracker
- no runtime or behavior changes were introduced

## Implementation

- updated `package.json` metadata fields for repository discovery
- updated `README.md` install and repository sections with the real GitHub URLs
- re-ran `npm pack --dry-run` to confirm package metadata remained valid

## Test Verification

- `npm pack --dry-run`

## Notes

- This was a metadata alignment follow-up to the broader public release preparation pass
- No version bump was needed because functionality did not change
