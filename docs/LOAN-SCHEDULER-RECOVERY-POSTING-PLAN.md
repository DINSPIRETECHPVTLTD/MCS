# Loan Scheduler – Recovery Posting: Full Detailed Plan

## Document purpose

This plan describes how to implement **filtered Loan Scheduler listing**, **single and bulk Post**, **partial-paid carry-forward**, and **mandatory editable fields on Post** without disturbing existing flows. It follows Controller → Service → Repository architecture and existing coding standards.

**Backend implementation:** All backend changes (controllers, services, repositories, DTOs, DB logic) are implemented in **`E:\Vinay\Project\API\MCS\MCS.sln`**. The Angular app (this repo) only consumes the new APIs.

---

## 1. Constraints and principles

| Constraint | How it is respected |
|------------|---------------------|
| Do not disturb existing flows | New endpoints only; existing Loan/Payment/Recovery APIs unchanged. |
| Controller → Service → Repository | All new logic in dedicated Loan Scheduler controller, service, repository. |
| Existing coding standards | Match patterns from existing services (e.g. `LoanService`, `MemberService`), AG Grid usage as in `recovery-posting.page.ts`. |
| If existing API changes affect other modules | Do not modify existing GET/POST for loan schedulers; add new endpoints. |
| Analyze first, implement after confirmation | This document is the analysis; implementation only after sign-off. |

---

## 2. Database structure (LoanSchedulers)

Use the existing table as specified:

| Column | Type | Notes |
|--------|------|--------|
| LoanSchedulerId | int | PK |
| LoanId | int | FK to Loans |
| ScheduleDate | datetime2 | For filtering (mandatory) |
| PaymentDate | datetime2 | Null until posted; set by API on Post |
| PaymentAmount | decimal | Scheduled EMI |
| InstallmentNo | int | Order of installment |
| InterestAmount | decimal | Scheduled interest |
| PrincipalAmount | decimal | Scheduled principal |
| Status | nvarchar | 'Paid', 'Not Paid', 'Partial Paid' |
| PaymentMode | nvarchar | User input, mandatory on Post |
| ActualEmiAmount | decimal | User input, mandatory on Post |
| ActualInterestAmount | decimal | User input, mandatory on Post |
| ActualPrincipalAmount | decimal | User input, mandatory on Post |
| Comments | nvarchar | User input, mandatory on Post |
| CollectedBy | int | FK to User; default = logged-in user |

**Join path for GET:**  
`LoanSchedulers` → `Loans` (LoanId) → `Members` (MemberId). From Members: `CenterId`, `POCId`; resolve Center Name and POC Name via Center/POC tables.

---

## 3. Filtering requirements

### 3.1. Inputs (from UI to API)

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| ScheduleDate | **Yes** | date or range | Single date or From/To. Backend can accept `scheduleDateFrom`, `scheduleDateTo` (same value for single-day). |
| CenterId | No | int? | Filter by member’s center. |
| POCId | No | int? | Filter by member’s POC. |
| PageNumber | Yes (for paging) | int | 1-based. |
| PageSize | Yes | int | e.g. 20, 50. |
| SortBy | No | string | e.g. ScheduleDate, LoanId, InstallmentNo. |
| SortDirection | No | string | ASC / DESC. |

### 3.2. Business filters (always applied in query)

- `Status <> 'Paid'`  
- `PaymentDate IS NULL`  
  - So that already-posted rows (including Partial Paid) never appear again.

### 3.3. “Only next unpaid installment” per loan

- Among rows that pass the above filters, return **only the next unpaid installment per loan** (smallest `InstallmentNo` per `LoanId`).
- Implementation: use a subquery with `ROW_NUMBER() OVER (PARTITION BY LoanId ORDER BY InstallmentNo)` and keep `rn = 1`.

### 3.4. SQL join (conceptual)

```text
LoanSchedulers ls
INNER JOIN Loans l ON ls.LoanId = l.LoanId
INNER JOIN Members m ON l.MemberId = m.MemberId
LEFT JOIN Centers c ON m.CenterId = c.CenterId   -- or equivalent
LEFT JOIN POCs p ON m.POCId = p.Id               -- or equivalent
WHERE ls.ScheduleDate BETWEEN @From AND @To
  AND (@CenterId IS NULL OR m.CenterId = @CenterId)
  AND (@POCId IS NULL OR m.POCId = @POCId)
  AND ls.Status <> 'Paid'
  AND ls.PaymentDate IS NULL
```

Then wrap in a CTE/subquery with `ROW_NUMBER() ... PARTITION BY ls.LoanId ORDER BY ls.InstallmentNo` and `WHERE rn = 1`. Use **parameterized queries** for all inputs.

### 3.5. Backend troubleshooting (GET recovery returns no rows)

If `GET .../LoanSchedulers/recovery?scheduleDate=2026-03-02&pageSize=20` returns an empty list even when the DB has rows for that date:

1. **PaymentDate “unpaid” condition**  
   The plan above uses `PaymentDate IS NULL`. In the actual DB, unpaid rows may use a sentinel value (e.g. `9999-01-01 00:00:00`) instead of NULL. In that case, **no rows** will match `PaymentDate IS NULL`.  
   **Fix:** Treat unpaid as “not yet paid”, e.g.  
   `(ls.PaymentDate IS NULL OR ls.PaymentDate >= '9999-01-01')`  
   (or use the same sentinel value your schema uses). Do not rely only on `PaymentDate IS NULL` if the table uses a sentinel date.

2. **ScheduleDate filter**  
   Filter by **date only**, not datetime. The API receives `scheduleDate=2026-03-02`. Compare using the date part of `ScheduleDate` (e.g. `CAST(ls.ScheduleDate AS DATE) = @ScheduleDate` or equivalent), so rows with `2026-03-02 00:00:00.0000000` match.

3. **branchId**  
   If the backend requires `branchId` and returns no rows when it is missing, the frontend will send it when the user has a branch. For manual testing, add `&branchId=1` (or the correct branch id) to the URL.

4. **“Next installment only”**  
   If the API returns only the *next* unpaid installment per loan (ROW_NUMBER = 1), then for `2026-03-02` only one row per loan with that ScheduleDate should appear. Ensure the date filter is applied before or correctly inside that logic.

---

## 4. AG Grid – columns and behaviour

### 4.1. Read-only columns (from API)

| Column | Source | Notes |
|--------|--------|--------|
| Center Name | From Members → Center | |
| Member Name | From Members | |
| POC Name | From Members → POC | |
| LoanId | LoanSchedulers.LoanId | |
| ScheduleDate | LoanSchedulers.ScheduleDate | |
| InstallmentNo | LoanSchedulers.InstallmentNo | |
| InterestAmount | LoanSchedulers.InterestAmount | |
| PrincipalAmount | LoanSchedulers.PrincipalAmount | |
| PaymentAmount | LoanSchedulers.PaymentAmount | |
| Status | LoanSchedulers.Status | Display only. |
| CarryForwardEmiAmount | Calculated | e.g. `PaymentAmount - ActualEmiAmount` when partial; else 0. Can be computed in API or frontend from PaymentAmount and ActualEmiAmount. |

### 4.2. Editable columns (all mandatory on Post)

| Column | Editor | Validation |
|--------|--------|------------|
| PaymentMode | Text input | Non-empty on Post. |
| Status | Dropdown: Paid, Not Paid, Partial Paid | Optional: can be read-only and derived by API from amounts. |
| ActualEmiAmount | Number input | Required, ≥ 0, ≤ PaymentAmount. |
| ActualInterestAmount | Number input | Required, ≥ 0. |
| ActualPrincipalAmount | Number input | Required, ≥ 0. |
| Comments | Text input | Non-empty on Post. |
| CollectedBy | Dropdown (users) or display + default | Default = logged-in user; must have value on Post. | This should placed near to the Filter Drop down

**Important:** When user clicks **Post** (single or bulk), **all** these editable fields must be filled and valid. If any is missing or invalid, block the request and show which fields are missing (e.g. highlight cells and show a single message: “Please fill all mandatory fields (marked with *).”).

### 4.3. Row identification

- Each row must expose `LoanSchedulerId` (and optionally `LoanId`, `InstallmentNo`) for single/bulk Post API calls. Either include as a hidden column or keep in the row data model.

### 4.4. Actions

- **Single row Post:** e.g. action column with “Post” button; on click validate that row’s editable fields, then call the **same save API** with an array of **one** item (that row’s DTO).
- **Bulk Post:** “Post” button above/below grid; get selected rows, validate **all** selected rows’ editable fields; if any row has a missing/invalid field, show error and highlight; if all valid, call the **same save API** with an array of **N** items (selected rows’ DTOs).

---

## 5. Mandatory editable fields on Post (detailed)

### 5.1. Rule

**On Post (single or bulk), every editable field in the grid must be treated as mandatory.**

- PaymentMode: required, non-empty string.  
- ActualEmiAmount, ActualInterestAmount, ActualPrincipalAmount: required, numeric, ≥ 0; ActualEmiAmount ≤ PaymentAmount.  
- Comments: required, non-empty string.  
- CollectedBy: required (default to logged-in user if not already set).  
- Status: if editable, must be one of Paid / Not Paid / Partial Paid; alternatively leave as read-only and let API set from amounts.

### 5.2. Frontend (Angular/AG Grid)

1. **Column headers**  
   Add a visual indicator (e.g. `*`) for required columns: PaymentMode, ActualEmiAmount, ActualInterestAmount, ActualPrincipalAmount, Comments, CollectedBy.

2. **Cell validation / styling**  
   - Use AG Grid `cellClassRules` or a wrapper that adds an error class when a required field is empty or invalid (e.g. negative amount).  
   - Optional: `valueSetter` / `onCellValueChanged` to re-run validation and refresh row state.

3. **Pre-Post validation (single row)**  
   - Before calling single-post API:
     - Check all mandatory fields present and valid.
     - If invalid: show toast “Please fill all mandatory fields highlighted in red.” and optionally focus first invalid cell; do not call API.

4. **Pre-Post validation (bulk)**  
   - For each selected row, run the same checks.
   - Collect all invalid rows (or first N) and show one message: “Please fill all mandatory fields for the selected rows. Check highlighted cells.”
   - Do not call bulk-update until all selected rows pass.

5. **CollectedBy**  
   - On load, set default to logged-in user (from `UserContextService`).  
   - Ensure the value is sent in the payload for both single and bulk Post.

### 5.3. Backend

- **DTO validation:** Mark fields as required (e.g. `[Required]`, `[Range(0, double.MaxValue)]`) on the update DTO.  
- **Service layer:** Before calling repository, validate again (non-null, non-empty, numeric ranges). Return 400 with a clear message (e.g. “PaymentMode is required”) if any mandatory field is missing or invalid.  
- This ensures that even if the client is bypassed, the server enforces “all editable fields mandatory on Post”.

---

## 6. Partial paid and carry-forward logic

### 6.1. When does “Partial Paid” apply?

- When the user posts with **ActualEmiAmount < PaymentAmount** for that installment.
- Then:
  - Set that row: `Status = 'Partial Paid'`, `PaymentDate = GETDATE()`, set Actual* and PaymentMode, Comments, CollectedBy.
  - **Carry forward:**  
    `DifferenceAmount = PaymentAmount - ActualEmiAmount`  
    Add `DifferenceAmount` to the **next** installment’s `PaymentAmount` (same LoanId, next InstallmentNo, where Status <> 'Paid' and PaymentDate IS NULL).

### 6.2. Only next unpaid installment

- Paid installments: never shown (filter: Status <> 'Paid', PaymentDate IS NULL).  
- Partial Paid installments: once posted, they have PaymentDate set, so they are excluded from the GET query; they are not shown again.  
- So only the “next” unpaid installment per loan appears in the grid; carry-forward adds to that next one.

### 6.3. Transaction and double carry-forward prevention

- Run **each** single or bulk post inside a **single database transaction**.
- For the row being posted:
  - Re-read the row in the transaction (e.g. `SELECT ... WITH (UPDLOCK, ROWLOCK)` or equivalent) and check again:
    - `Status <> 'Paid'`
    - `PaymentDate IS NULL`
  - If already posted, **rollback** and return error “Installment already posted.”
- When applying carry-forward:
  - Find the next installment (same LoanId, min InstallmentNo > current, PaymentDate IS NULL) and add `DifferenceAmount` to `PaymentAmount` in the **same** transaction.
  - Do not apply carry-forward twice: the row is updated once and gets PaymentDate set, so it will never be updated again by this flow.

### 6.4. Validation before update

- Do not allow updating rows that are already Paid (or already posted, i.e. PaymentDate IS NOT NULL).  
- Reject with 400/409 and a clear message.

---

## 7. API specification

### 7.1. GET – Filtered installments (new endpoint)

- **Route:** `GET /api/loan-scheduler/filtered` (or `/api/loan-scheduler/filtered` under existing base).  
- **Query parameters (all parameterized):**
  - `scheduleDateFrom` (required), `scheduleDateTo` (required) – can be same for one day.
  - `centerId` (optional).
  - `pocId` (optional).
  - `pageNumber`, `pageSize`.
  - `sortBy`, `sortDirection` (optional).
- **Response:**  
  - `items`: array of grid row DTOs (CenterName, MemberName, POCName, LoanId, ScheduleDate, InstallmentNo, InterestAmount, PrincipalAmount, PaymentAmount, Status, CarryForwardEmiAmount, plus LoanSchedulerId and editable fields: PaymentMode, ActualEmiAmount, ActualInterestAmount, ActualPrincipalAmount, Comments, CollectedBy).  
  - `totalCount`: total matching rows (for pagination).

### 7.2. POST – Single unified save (single + bulk)

One API handles both single-row and bulk post by accepting an **array** of items. The frontend sends 1 item for single Post and N items for bulk Post; the backend runs one transaction for the whole list.

- **Route:** `POST /api/loan-scheduler/save` (or `POST /api/loan-scheduler/update`).  
- **Body:** Array of update DTOs — **one item for single Post, multiple items for bulk Post.**  
  - Each item: LoanSchedulerId (required); PaymentMode, ActualEmiAmount, ActualInterestAmount, ActualPrincipalAmount, Comments (all required); CollectedBy (optional; server can set from logged-in user).  
- **Behaviour:**  
  - Reject if array is empty (400).  
  - Start **one database transaction**.  
  - **Loop through each item** in the array, inside that same transaction:  
    - Validate row (not already paid; mandatory fields).  
    - Update current row; if Partial Paid, apply carry-forward to next installment.  
    - Set PaymentDate.  
  - If **any** item fails validation or is already posted: **rollback entire transaction**, return 400/409 with message.  
  - If **all** succeed: **commit once**, return 200 with summary (e.g. `{ "updatedCount": N }`).  

This gives one implementation of the posting logic, true all-or-nothing bulk behaviour, and the same endpoint for both single and bulk from the frontend.

### 7.3. Backend implementation layers

- **Controller:**  
  - Validates query/body (e.g. required date range, page size limits).  
  - Calls service methods; returns appropriate HTTP status and body.
- **Service:**  
  - Applies business rules (mandatory fields, amount rules, “already posted” check).  
  - Opens **one** transaction for the save list; calls repository to process each item in that transaction.
- **Repository:**  
  - GET: parameterized SQL with join, ROW_NUMBER, pagination (OFFSET/FETCH).  
  - SAVE: one method that accepts a list of update DTOs; runs inside one transaction; loops through items, applying the same single-row logic (validate, update, carry-forward) for each.

---

## 8. Frontend integration (recovery-posting page)

The existing **Recovery Posting** page (`recovery-posting.page.ts` / `.html`) already has:

- Filters: Date (mandatory), Center, POC, Collected By.  
- AG Grid with multi-row selection.  
- A “POST” button and `postSelected()`.  
- A call to `recoveryPostingService.getLoanSchedulersForRecovery(...)`.

**Planned changes (no change to other modules):**

1. **Align GET with new API**  
   - Either point `getLoanSchedulersForRecovery` to the new `GET /api/loan-scheduler/filtered` or add a new method that calls it.  
   - Ensure the response is mapped to the grid row model that includes: Center Name, Member Name, POC Name, LoanId, ScheduleDate, InstallmentNo, InterestAmount, PrincipalAmount, PaymentAmount, Status, CarryForwardEmiAmount, and all editable fields.  
   - Ensure only “next unpaid installment” data is shown (handled by backend).

2. **Grid columns**  
   - Add/align columns per section 4 (read-only + editable).  
   - Add hidden or visible `LoanSchedulerId` for API calls.  
   - Mark required columns with `*` and add `cellClassRules` for invalid/empty required fields.

3. **Single row Post**  
   - Add an action column “Post” per row.  
   - On click: validate all editable fields for that row; if valid, call `POST /api/loan-scheduler/save` with **body = [ that row’s DTO ]** (array of 1 item); on success refresh grid or remove row; on error show toast.

4. **Bulk Post**  
   - In `postSelected()`: get selected rows; validate **all** editable fields for each; if any invalid, show message and highlight; if all valid, call **the same** `POST /api/loan-scheduler/save` with **body = [ ...selected rows’ DTOs ]** (array of N items); on success show toast and reload data; on error show toast.

5. **CollectedBy**  
   - Default from `UserContextService`; ensure it is part of row data and sent on both single and bulk Post.

6. **Service**  
   - Add or extend methods: e.g. `getFilteredInstallments(...)` and **one** `save(items: LoanSchedulerUpdateDto[])` that calls `POST /api/loan-scheduler/save` with the array (single = 1 item, bulk = N items). Use `environment.apiUrl` and existing auth headers pattern (e.g. from `LoanService`).

---

## 9. Performance and indexing

- **LoanSchedulers:**  
  - Index on (ScheduleDate, Status, PaymentDate) for the filtered list.  
  - Index on (LoanId, InstallmentNo) for finding “next” installment and carry-forward.
- **Loans:**  
  - Index on MemberId (for join to Members).
- **Members:**  
  - Index on CenterId and POCId (for filter and join).

Pagination is implemented in the GET API (e.g. OFFSET/FETCH) so that only one page of data is returned per request.

---

## 10. Summary checklist

| # | Item | Owner |
|---|------|--------|
| 1 | New GET filtered endpoint with join, ROW_NUMBER, pagination, parameterized | Backend (MCS.sln) |
| 2 | Single POST save endpoint (array body): one transaction, loop items, validate + update + carry-forward each | Backend (MCS.sln) |
| 3 | DTOs and validation (required fields, ranges) | Backend (MCS.sln) |
| 4 | Indexes on LoanSchedulers, Loans, Members | Backend/DB (MCS.sln) |
| 5 | Frontend: grid columns (read-only + editable), LoanSchedulerId | Frontend |
| 6 | Frontend: all editable fields mandatory on Post, validation and highlight | Frontend |
| 7 | Frontend: single row Post — validate row, call save API with [1 item] | Frontend |
| 8 | Frontend: bulk Post — validate selected rows, call same save API with [N items] | Frontend |
| 9 | Frontend: CollectedBy default and wiring to POST payloads | Frontend |
| 10 | Integration: point recovery-posting GET to new endpoint and map response | Frontend |
| 11 | No changes to existing Loan/Payment/Recovery APIs or other modules | Both |

---

## 11. File / component mapping (high level)

- **Backend — all in `E:\Vinay\Project\API\MCS\MCS.sln`:**  
  - Controller: e.g. `LoanSchedulerController` (new) — GET filtered, POST save (array).  
  - Service: e.g. `ILoanSchedulerService` / `LoanSchedulerService` — one `Save(IEnumerable<LoanSchedulerUpdateDto>)` that runs in one transaction and loops items.  
  - Repository: e.g. `ILoanSchedulerRepository` / `LoanSchedulerRepository` — GetFiltered; Save (list) inside transaction.  
  - DTOs: e.g. `LoanSchedulerFilterRequest`, `LoanSchedulerGridDto`, `LoanSchedulerUpdateDto`.

- **Frontend (MCS Angular app, this repo):**  
  - Page: existing `recovery-posting.page.ts` / `.html` / `.scss`.  
  - Service: existing or new `RecoveryPostingService` (or `LoanSchedulerService`) with `getFilteredInstallments()` and **one** `save(items: LoanSchedulerUpdateDto[])` — single Post sends `[one]`, bulk Post sends selected rows array.  
  - Models: DTOs/interfaces for filter request, grid row, and update payload.

This plan is intended to be implemented only after confirmation from your side.
