# Smoke Checks — before merge

> qa runs these; the team lead requires ✅ before merging to main.

## Automated quality gates
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`

## Manual smoke (filled in as features get specced)
- [ ] Sign-in + sign-out work
- [ ] Role guard: a user with role X cannot reach a role-Y page (redirect to /dashboard)
- [ ] Create campaign → persisted to DB, shows in dashboard
- [ ] Submit application → visible to both sides
- [ ] Manual escrow status transition → written to DB + AuditLog
- [ ] Click via partner code → AffiliateClick recorded; order → AttributedOrder recorded
- [ ] Plugin endpoints reject input without a valid HMAC signature
