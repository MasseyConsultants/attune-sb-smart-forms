# attune-sb-smart-forms — Backlog

> Author: Robert Massey | Created: 2026-07-11
> Single intake for new requirements. Never implement a backlog item without
> first scheduling it into a sprint.

## Active Backlog

| ID     | Priority | Title                                                                                                           | Source                        | Target                    | Notes                                                                                          |
| ------ | -------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------- |
| SB-001 | P2       | Google OAuth social login                                                                                       | MASTER_PLAN §4 Auth           | S3 (fast-follow)          | SMBs expect it; signup friction reducer                                                        |
| SB-002 | P2       | MFA/TOTP                                                                                                        | Deferred from enterprise port | v1.1                      | Port from enterprise auth module                                                               |
| SB-003 | P3       | Enterprise SSO/OIDC ("Business+" add-on)                                                                        | MASTER_PLAN cuts              | v2.0                      | Only on customer demand                                                                        |
| SB-004 | P2       | AI workflow nodes (ai_action/decision/extract/transform)                                                        | MASTER_PLAN node catalog      | v1.5                      | Strong upsell; adapters exist in enterprise                                                    |
| SB-005 | P2       | AI mapping Stage 2 (vision, BYOK)                                                                               | Enterprise ADR-004            | v1.5                      | Stage 1 free engine ships in v1                                                                |
| SB-006 | P2       | Metered overage packs (e.g. +1,000 submissions for $10)                                                         | Pricing design rule 4         | v1.1                      | Fast-follow after limit telemetry exists                                                       |
| SB-007 | P3       | Native mobile apps (port enterprise Expo apps)                                                                  | MASTER_PLAN ADR-004           | Post-PMF                  | Public web forms cover fill-side at v1                                                         |
| SB-008 | P3       | Per-permission RBAC table                                                                                       | MASTER_PLAN §4 RBAC           | On demand                 | Roles suffice for SMB v1                                                                       |
| SB-009 | P3       | Push notifications (FCM/APNs)                                                                                   | MASTER_PLAN cuts              | With SB-007               | In-app + email only at v1                                                                      |
| SB-010 | P3       | Azure Document Intelligence for scanned PDFs                                                                    | Enterprise SmartMapper        | v1.5                      | Ties to SB-005                                                                                 |
| SB-011 | P3       | Affiliate/referral program                                                                                      | Growth                        | Post-launch               | —                                                                                              |
| SB-012 | P3       | Annual-plan proration edge cases                                                                                | Billing                       | v1.1                      | Stripe Portal covers basics at v1                                                              |
| SB-013 | P3       | EU data residency                                                                                               | Compliance                    | On demand                 | —                                                                                              |
| SB-016 | P1       | Platform admin console (orgs, users, subscriptions, usage, lifecycle/legal-hold actions, support impersonation) | Owner request 2026-07-13      | **✅ Done S9**            | Shipped read-mostly (list/detail/legal-hold/restore/overrides); impersonation stays backlogged |
| SB-017 | P2       | S3/R2 blob-storage driver + presigned upload flow                                                               | S5 ADR-0003 (local disk v1)   | Pre-multi-instance deploy | BlobStorageService interface is S3-shaped; swap without touching callers                       |

## Completed

| ID     | Title                                                   | Shipped | Notes                                          |
| ------ | ------------------------------------------------------- | ------- | ---------------------------------------------- |
| SB-014 | Downgrade UX: choose which forms stay live over new cap | S4      | Over-cap picker card on /billing               |
| SB-015 | Export-all entry point (org data takeout)               | S4      | "Export your data" card on /billing, read-only |

## Rules

1. Never implement a backlog item without first scheduling it into a sprint
2. P0 items can be fast-tracked into the current sprint (document in scorecard)
3. P1 items should be scheduled within 2 sprints
4. P2–P3 items are reviewed at the end of each phase
