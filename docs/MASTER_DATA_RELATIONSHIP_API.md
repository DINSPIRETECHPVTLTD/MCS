# Master Data – Relationship Field (Backend Requirements)

The frontend has been updated to support a **Relationship** field on Master Lookups. The backend API and database must be updated as follows.

---

## 1. Add Master Data API (Create / Update)

### Request model

- Add a **Relationship** property to the create/update request DTO (e.g. `CreateMasterLookupRequest` / `UpdateMasterLookupRequest`).
- Type: `string` or `string?` (nullable).
- **Validation (recommended):** If provided, allow only:  
  `Father`, `Mother`, `Husband`, `Wife`, `Son`, `Daughter`, `Brother`, `Sister`.  
  Reject or normalize any other value (e.g. return 400 or map to null).

### Database

- Add a column to the **MasterLookups** (or equivalent) table, e.g.:
  - **Column name:** `Relationship` (or `RelationshipId` if you use a lookup).
  - **Type:** `NVARCHAR(50)` or `VARCHAR(50)`, nullable.
- Ensure create/update operations read the Relationship from the request and persist it to this column.

---

## 2. Get All Master Data API (List / Get by Id)

### Response model

- Add **Relationship** to the response DTO (e.g. `MasterLookupDto` or the entity returned by the API).
- Type: `string` or `string?` (nullable).
- **Ensure:** The value stored in the database is returned in the JSON response (same property name: `relationship` in camelCase or `Relationship` in PascalCase depending on your serializer).

### All Master Data screen

- The frontend already shows a **Relationship** column in the grid; it will display whatever the API returns in the `relationship` / `Relationship` property.

---

## 3. Add Master Data Form (UI) – Done in frontend

- A **Relationship** dropdown has been added with:
  - **Values:** Father, Mother, Husband, Wife, Son, Daughter, Brother, Sister.
  - Optional “-- None --” (sends `null`/empty to the API).
- The selected value is sent in the create/update request and is loaded when editing.

---

## Summary checklist (backend)

- [ ] Add `Relationship` to create/update request model (nullable string).
- [ ] Add validation: only allow the 8 values above (or null/empty).
- [ ] Add `Relationship` column to MasterLookups table (e.g. `NVARCHAR(50)` NULL).
- [ ] Map request `Relationship` to DB on create/update.
- [ ] Add `Relationship` to get/list response model and return it from API.
