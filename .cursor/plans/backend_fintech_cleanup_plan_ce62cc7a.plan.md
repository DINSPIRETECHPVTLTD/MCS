---
name: Backend Fintech Cleanup Plan
overview: Harden LoanScheduler backend endpoints and service logic for fintech-grade money movement safety, contract integrity, idempotency, and operational reliability.
todos:
  - id: p0-money-guards
    content: Implement strict posting invariants and duplicate scheduler ID rejection in LoanSchedulerService.SaveAsync.
    status: pending
  - id: p0-contract-hardening
    content: Enforce strict status/payment mode contract and remove ambiguous fallback normalization.
    status: pending
  - id: p0-authz-enforcement
    content: Add per-row org/branch authorization checks inside save flow.
    status: pending
  - id: p0-idempotency
    content: Add Idempotency-Key handling and atomic dedupe for POST save endpoint.
    status: pending
  - id: p1-concurrency
    content: Add RowVersion-based optimistic concurrency and conflict handling.
    status: pending
  - id: p1-error-contract
    content: Standardize controller/service error responses with traceable payload format.
    status: pending
  - id: p2-query-cors
    content: Optimize recovery query filtering and tighten production CORS policy.
    status: pending
  - id: backend-tests
    content: Add unit/integration tests for all critical financial and authorization invariants.
    status: pending
isProject: false
---

# Backend Cleanup Plan (Fintech-Grade)

## Objective

Clean and harden the LoanScheduler backend flow to eliminate critical risks in money posting: duplicate submit, authorization bypass, ambiguous status/payment-mode mapping, silent/weak error contracts, and overposting/lost-update scenarios.

## In-Scope Files

- [E:/Vinay/Project/API/MCS/MCS.WebApi/Controllers/LoanSchedulersController.cs](E:/Vinay/Project/API/MCS/MCS.WebApi/Controllers/LoanSchedulersController.cs)
- [E:/Vinay/Project/API/MCS/MCS.WebApi/Services/LoanSchedulerService.cs](E:/Vinay/Project/API/MCS/MCS.WebApi/Services/LoanSchedulerService.cs)
- [E:/Vinay/Project/API/MCS/MCS.WebApi/DTOs/LoanScheduler/LoanSchedulerSaveDto.cs](E:/Vinay/Project/API/MCS/MCS.WebApi/DTOs/LoanScheduler/LoanSchedulerSaveDto.cs)
- [E:/Vinay/Project/API/MCS/MCS.WebApi/DTOs/LoanScheduler/LoanSchedulerRecoveryDto.cs](E:/Vinay/Project/API/MCS/MCS.WebApi/DTOs/LoanScheduler/LoanSchedulerRecoveryDto.cs)
- [E:/Vinay/Project/API/MCS/MCS.WebApi/Models/LoanScheduler.cs](E:/Vinay/Project/API/MCS/MCS.WebApi/Models/LoanScheduler.cs)
- [E:/Vinay/Project/API/MCS/MCS.WebApi/Data/ApplicationDbContext.cs](E:/Vinay/Project/API/MCS/MCS.WebApi/Data/ApplicationDbContext.cs)
- [E:/Vinay/Project/API/MCS/MCS.WebApi/Program.cs](E:/Vinay/Project/API/MCS/MCS.WebApi/Program.cs)

## Remediation Tracks

### 1) Money Movement Safety Guards (P0)

- Enforce invariants in `SaveAsync`:
  - `PaymentAmount >= 0`, `PrincipalAmount >= 0`, `InterestAmount >= 0`
  - `PrincipalAmount + InterestAmount == PaymentAmount` (small epsilon)
  - `PaymentAmount <= schedule.ActualEmiAmount`
  - For `Paid`, amount must equal scheduled amount
  - For `Not Paid`, all amounts must be `0` and comment required
- Reject duplicate `LoanSchedulerId` entries in a single bulk payload.
- Add strict handling for final installment carry-forward edge case (no next installment).

### 2) DTO Contract Integrity (P0)

- Replace free-form status strings with strict enum-like contract and fail-fast validation:
  - Allowed statuses only: `Paid`, `Partial`, `Not Paid`
- Remove ambiguous normalization fallback (`return "Partial"` for unknown).
- Standardize `PaymentMode` contract (code vs value) and validate against master lookup source.
- Return consistent API-facing values in `LoanSchedulerRecoveryDto` and save input expectations.

### 3) Authorization Enforcement (P0)

- In `SaveAsync`, validate each scheduler row against caller scope:
  - Branch user can post only their branch rows
  - Organization user can post only rows under their organization
- Keep role attributes in controller, but enforce resource-level authorization in service.

### 4) Idempotency + Duplicate Submit Protection (P0)

- Introduce idempotency key support on `POST api/LoanSchedulers/save`:
  - Require/request `Idempotency-Key` header for posting.
  - Store request fingerprint + response metadata.
  - Return previously committed result for repeated keys.
- Ensure transaction boundary covers idempotency record + posting updates atomically.

### 5) Concurrency & Data Race Hardening (P1)

- Add optimistic concurrency token (`RowVersion`) to `LoanScheduler`.
- Handle concurrency exceptions with explicit conflict responses.
- Add DB unique index guard for schedule generation consistency:
  - Suggested unique key: `(LoanId, InstallmentNo)`.

### 6) Error Contract & Observability (P1)

- Replace raw string `BadRequest(ex.Message)` with structured error payload:
  - `code`, `message`, `traceId`, optional `details`.
- Improve logs for posting attempts:
  - userId, branch/org context, scheduler ids, status transitions, idempotency key, outcome.

### 7) Performance & Query Efficiency (P2)

- Refactor recovery query to reduce broad in-memory materialization:
  - Push branch/center/poc filters and next-unpaid selection to SQL as much as feasible.
- Keep pagination semantics consistent and explicit in API docs/response metadata.

### 8) Security Posture (P2)

- Tighten CORS policy in `Program.cs` by environment allowlist (no unrestricted origins in production).
- Maintain JWT validation, add hardened defaults where missing.

## Validation & Test Plan

- Add unit/integration tests for:
  - status normalization rejection paths
  - payment mode validation
  - overposting rejection
  - principal+interest sum mismatch rejection
  - duplicate scheduler id in payload rejection
  - branch/org unauthorized posting rejection
  - idempotent replay behavior (same key + same payload)
  - concurrency conflict path
- Add regression tests for partial and not-paid carry-forward accounting.

## Execution Order

1. P0 guards and contract hardening in service + controller.
2. Idempotency key implementation.
3. Concurrency token and migration.
4. Error contract standardization + tests.
5. Performance query refactor and CORS hardening.

## Done Criteria

- No ambiguous enum acceptance.
- No duplicate-submit posting side effects.
- No unauthorized cross-branch/org posting.
- Deterministic, structured error responses.
- Test coverage for all P0/P1 financial safeguards.

## Non-Regression Constraint

- Existing functionality must not break due to any backend hardening change.
- Keep API compatibility for current frontend flows; if contract tightening is introduced, support backward-compatible handling during rollout.
- Validate every P0/P1 change with regression tests for existing posting and recovery scenarios.
