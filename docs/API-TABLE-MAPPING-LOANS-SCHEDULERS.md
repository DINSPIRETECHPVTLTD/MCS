# API and Table Mapping: Loans & LoanSchedulers

This document maps the **frontend screens** to the **backend APIs** and the **database tables** (Loans, LoanSchedulers) so the correct data is returned.

---

## 1. All Loans (Manage Loan page)

**Screen:** Manage Loan → grid showing all loans for the selected branch.

**Data must come from:** `[dinspire_sa].[Loans]` (filtered by branch via relationship).

### API used by frontend

| Method | Endpoint (as called from app) | Full URL (after interceptor) |
|--------|-------------------------------|-------------------------------|
| GET    | `/api/Loans/branch/{branchId}` | `{environment.apiUrl}/Loans/branch/{branchId}` e.g. `https://localhost:61008/api/Loans/branch/5` |

**Frontend service:** `LoanService.getLoansByBranch(branchId)`  
**File:** `src/app/services/loan.service.ts`

**Response:** Either `Loan[]` or `{ $values: Loan[] }` (frontend normalizes to array).

### Table → API response mapping (Loans)

Backend should return rows from **Loans** (and any join needed for branch filter). Map columns as follows:

| Loans table column     | Frontend Loan / API field | Type / notes |
|------------------------|---------------------------|--------------|
| Id                     | id                        | number       |
| MemberId               | memberId                  | number       |
| LoanAmount             | loanAmount                | number       |
| InterestAmount         | interestAmount            | number       |
| ProcessingFee          | processingFee             | number       |
| InsuranceFee            | insuranceFee              | number       |
| IsSavingEnabled        | isSavingEnabled           | boolean      |
| SavingAmount           | savingAmount              | number       |
| TotalAmount            | totalAmount               | number       |
| Status                 | status                    | string       |
| DisbursementDate       | disbursementDate          | string (ISO date) or null |
| ClosureDate            | closureDate               | string or null |
| CollectionStartDate    | collectionStartDate       | string or null |
| CollectionTerm         | collectionTerm            | string       |
| NoOfTerms              | noOfTerms                 | number       |
| CreatedBy              | createdBy                 | number       |
| CreatedAt              | createdAt                 | string       |
| ModifiedBy              | modifiedBy                | number or null |
| ModifiedAt             | modifiedAt                | string or null |
| IsDeleted              | isDeleted                 | boolean      |

**Branch filter:** Loans table has no BranchId; branch is usually via **Member** (e.g. Loan → Member → Center → Branch, or Member → Branch). The API `GET /api/Loans/branch/{branchId}` must filter loans so that the loan’s member belongs to the given branch (using your existing relationship).

---

## 2. Loan Repayment Summary page

**Screen:** Manage Loan → View → Loan Repayment Summary (read-only summary + week-wise schedule).

**Data must come from:**

1. **Loans** – for summary (Total Amount, Remaining Balance, Weekly Due, and term/collection info).
2. **LoanSchedulers** – for week-wise rows (and any related data via relationship).

### APIs used by frontend

| Purpose | Method | Endpoint | Full URL (example) |
|--------|--------|----------|---------------------|
| Loan details (summary) | GET | `/api/Loans/{loanId}` | `{environment.apiUrl}/Loans/123` |
| Schedule rows (grid)   | GET | `/api/LoanSchedulers/by-loan/{loanId}` | `{environment.apiUrl}/LoanSchedulers/by-loan/123` |

**Frontend:**
- **Loan:** `LoanService.getLoanById(loanId)` → `src/app/services/loan.service.ts`
- **Schedule:** `RecoveryPostingService.getSchedulerByLoanId(loanId)` → `src/app/services/recovery-posting.service.ts`

### 2.1 Loan (single) – from Loans table

Same **Loans** table and mapping as above. Single row by `Id = loanId`.

---

### 2.2 Week-wise schedule – from LoanSchedulers table

Backend should return rows from **LoanSchedulers** for the given `loanId` (and any joined data for display). Frontend expects either:

- **Option A:** Array of objects with: `weekNo`, `collectionDate`, `paidDate`, `paymentStatus`, `paidAmount`, `reasons`, or  
- **Option B:** Array of objects that map from **LoanSchedulers** columns (see below); frontend will map them.

**LoanSchedulers table → Repayment Summary grid**

| LoanSchedulers column   | Frontend RepaymentScheduleRowDto | Notes |
|-------------------------|-----------------------------------|--------|
| InstallmentNo           | weekNo                            | Week/installment number |
| ScheduleDate            | collectionDate                    | **Collection Date** – use [ScheduleDate] from [LoanSchedulers] as-is (not computed from Loan + POC). |
| PaymentDate             | paidDate                           | Date when payment was recorded; null if not paid |
| Status                  | paymentStatus                      | Map: 'Partial' → 'Partially Paid'; else 'Paid' / 'Not Paid' |
| ActualEmiAmount         | paidAmount                         | 0 when not paid |
| Comments                | reasons                            | Reason for non/partial payment |
| (InterestAmount, PrincipalAmount, PaymentAmount, etc.) | Optional for display/calculations | |

**Relationship:** LoanSchedulers has `LoanId` → Loans. For “by loan” API, filter:

```sql
WHERE LoanId = @loanId
ORDER BY InstallmentNo
```

If you use a different column for the loan FK (e.g. LoanId1), filter by that. Frontend only needs rows for the requested loan.

**Collection Date:** Use [ScheduleDate] from [LoanSchedulers] for the grid column "Collection Date". Do not compute from Loan + POC.

---

## 3. Summary

| Screen / data           | Table(s)        | API endpoint |
|-------------------------|-----------------|--------------|
| **All Loans (Manage Loan)** | Loans (via branch relationship) | `GET /api/Loans/branch/{branchId}` |
| **Loan Repayment Summary – loan** | Loans           | `GET /api/Loans/{loanId}` |
| **Loan Repayment Summary – schedule** | LoanSchedulers (by LoanId) | `GET /api/LoanSchedulers/by-loan/{loanId}` |

Ensure the backend implements:

1. **GET /api/Loans/branch/{branchId}** – returns loans from **Loans** filtered by branch (via Member/relationship).
2. **GET /api/Loans/{loanId}** – returns one row from **Loans** by Id.
3. **GET /api/LoanSchedulers/by-loan/{loanId}** – returns rows from **LoanSchedulers** for that loan (and any related data you need), mapped to the response shape above.
