# Add Member Functionality - Backend Implementation Guide

## Table of Contents
1. [Frontend Implementation Summary](#frontend-implementation-summary)
2. [Backend API Endpoints Required](#backend-api-endpoints-required)
3. [Database Schema](#database-schema)
4. [C# Backend Implementation](#c-backend-implementation)
5. [Integration Steps](#integration-steps)
6. [Error Handling](#error-handling)

---

## Frontend Implementation Summary

### Files Created:
1. **`src/app/models/member.models.ts`** - TypeScript interfaces for member data
2. **`src/app/services/member.service.ts`** - Angular service for API communication
3. **`src/app/pages/branches/add-member-modal.component.ts`** - Modal component logic
4. **`src/app/pages/branches/add-member-modal.component.html`** - Modal template
5. **`src/app/pages/branches/add-member-modal.component.scss`** - Modal styling

### Files Modified:
1. **`src/app/pages/branches/branches.module.ts`** - Added AddMemberModalComponent & ReactiveFormsModule
2. **`src/app/pages/branches/branches.page.ts`** - Added modal opening methods
3. **`src/app/pages/branches/branches.page.html`** - Added Members tab with Add Member button

---

## Backend API Endpoints Required

### 1. Get Branch Options
```
GET /api/branches/options
Authorization: Bearer {token}

Response (200 OK):
[
  {
    "id": 1,
    "name": "Main Branch",
    "code": "MB"
  },
  ...
]
```

### 2. Get Centers by Branch
```
GET /Centers/branch/{branchId}
Authorization: Bearer {token}

Response (200 OK):
[
  {
    "id": 1,
    "name": "Center A",
    "branchId": 1
  },
  ...
]
```

### 3. Get POCs by Branch and Center
```
GET /api/pocs/branch/{branchId}/center/{centerId}
Authorization: Bearer {token}

Response (200 OK):
[
  {
    "id": 1,
    "name": "John Doe",
    "branchId": 1,
    "centerId": 1,
    "contactNumber": "9876543210",
    "email": "john@example.com"
  },
  ...
]
```

### 4. Get POC by ID
```
GET /api/pocs/{pocId}
Authorization: Bearer {token}

Response (200 OK):
{
  "id": 1,
  "name": "John Doe",
  "branchId": 1,
  "centerId": 1,
  "contactNumber": "9876543210",
  "email": "john@example.com"
}
```

### 5. Validate Aadhaar Uniqueness
```
GET /api/members/validate-aadhaar/{aadhaar}
Authorization: Bearer {token}

Response (200 OK):
{
  "isUnique": true,
  "message": "Aadhaar is available"
}

Response (400 Bad Request) - If Aadhaar exists:
{
  "isUnique": false,
  "message": "Aadhaar number already exists"
}
```

### 6. Create Member
```
POST /api/members
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "branchId": 1,
  "centerId": 1,
  "pocId": 1,
  "firstName": "Rajesh",
  "middleName": "Kumar",
  "lastName": "Singh",
  "dateOfBirth": "1990-05-15",
  "age": 33,
  "phoneNumber": "9876543210",
  "address": "123 Main Street, City",
  "aadhaar": "123456789012",
  "occupation": "Business Owner",
  "status": "Active",
  "husbandGuardianName": "Rajesh Singh",
  "husbandGuardianAge": 45
}

Response (201 Created):
{
  "id": 1,
  "branchId": 1,
  "centerId": 1,
  "pocId": 1,
  "firstName": "Rajesh",
  "middleName": "Kumar",
  "lastName": "Singh",
  "dateOfBirth": "1990-05-15",
  "age": 33,
  "phoneNumber": "9876543210",
  "address": "123 Main Street, City",
  "aadhaar": "123456789012",
  "occupation": "Business Owner",
  "status": "Active",
  "husbandGuardianName": "Rajesh Singh",
  "husbandGuardianAge": 45,
  "createdAt": "2026-01-21T10:30:00Z",
  "updatedAt": "2026-01-21T10:30:00Z"
}

Response (400 Bad Request):
{
  "errors": [
    "Aadhaar already exists",
    "Phone number format is invalid"
  ],
  "message": "Validation failed"
}
```

### 7. Update Member
```
PUT /api/members/{memberId}
Authorization: Bearer {token}
Content-Type: application/json

Request Body: (Same as Create Member)

Response (200 OK): (Member object)
```

### 8. Get Member by ID
```
GET /api/members/{memberId}
Authorization: Bearer {token}

Response (200 OK): (Member object)
```

### 9. Get Members by Branch
```
GET /api/members/branch/{branchId}
Authorization: Bearer {token}

Response (200 OK):
[
  { Member objects },
  ...
]
```

### 10. Delete Member
```
DELETE /api/members/{memberId}
Authorization: Bearer {token}

Response (204 No Content)
```

---

## Database Schema

### Members Table
```sql
CREATE TABLE Members (
    Id INT PRIMARY KEY IDENTITY(1,1),
    BranchId INT NOT NULL,
    CenterId INT NOT NULL,
    PocId INT NOT NULL,
    FirstName NVARCHAR(50) NOT NULL,
    MiddleName NVARCHAR(50),
    LastName NVARCHAR(50) NOT NULL,
    DateOfBirth DATE NOT NULL,
    Age INT NOT NULL,
    PhoneNumber NVARCHAR(15) NOT NULL,
    Address NVARCHAR(MAX),
    Aadhaar NVARCHAR(12) NOT NULL UNIQUE,
    Occupation NVARCHAR(100),
    Status NVARCHAR(20) NOT NULL DEFAULT 'New',
    HusbandGuardianName NVARCHAR(100) NOT NULL,
    HusbandGuardianAge INT NOT NULL,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME DEFAULT GETUTCDATE(),
    FOREIGN KEY (BranchId) REFERENCES Branches(Id),
    FOREIGN KEY (CenterId) REFERENCES Centers(Id),
    FOREIGN KEY (PocId) REFERENCES PointOfContacts(Id),
    CHECK (Age > 0 AND Age < 150),
    CHECK (HusbandGuardianAge >= 18),
    CHECK (LEN(PhoneNumber) >= 10 AND LEN(PhoneNumber) <= 15),
    CHECK (LEN(Aadhaar) = 12)
);

-- Indexes for better query performance
CREATE INDEX IX_Members_BranchId ON Members(BranchId);
CREATE INDEX IX_Members_CenterId ON Members(CenterId);
CREATE INDEX IX_Members_PocId ON Members(PocId);
CREATE INDEX IX_Members_Aadhaar ON Members(Aadhaar);
CREATE INDEX IX_Members_Status ON Members(Status);
```

---

## C# Backend Implementation

### 1. Member Model (Entity)

```csharp
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YourProject.Models
{
    [Table("Members")]
    public class Member
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [ForeignKey("Branch")]
        public int BranchId { get; set; }

        [Required]
        [ForeignKey("Center")]
        public int CenterId { get; set; }

        [Required]
        [ForeignKey("PointOfContact")]
        public int PocId { get; set; }

        [Required]
        [StringLength(50)]
        public string FirstName { get; set; }

        [StringLength(50)]
        public string MiddleName { get; set; }

        [Required]
        [StringLength(50)]
        public string LastName { get; set; }

        [Required]
        public DateTime DateOfBirth { get; set; }

        [Required]
        [Range(1, 150)]
        public int Age { get; set; }

        [Required]
        [StringLength(15)]
        [RegularExpression(@"^\d{10,15}$", ErrorMessage = "Phone must be 10-15 digits")]
        public string PhoneNumber { get; set; }

        public string Address { get; set; }

        [Required]
        [StringLength(12, MinimumLength = 12)]
        [RegularExpression(@"^\d{12}$", ErrorMessage = "Aadhaar must be exactly 12 digits")]
        public string Aadhaar { get; set; }

        [StringLength(100)]
        public string Occupation { get; set; }

        [Required]
        [StringLength(20)]
        public string Status { get; set; } = "New"; // New, Active, Inactive

        [Required]
        [StringLength(100)]
        public string HusbandGuardianName { get; set; }

        [Required]
        [Range(18, 150)]
        public int HusbandGuardianAge { get; set; }

        [Column("IsActive")]
        public bool IsActive { get; set; } = true;

        [Column("CreatedAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("UpdatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual Branch Branch { get; set; }
        public virtual Center Center { get; set; }
        public virtual PointOfContact PointOfContact { get; set; }
    }
}
```

### 2. Member DTO (Data Transfer Object)

```csharp
using System;
using System.ComponentModel.DataAnnotations;

namespace YourProject.DTOs
{
    public class CreateMemberRequest
    {
        [Required]
        public int BranchId { get; set; }

        [Required]
        public int CenterId { get; set; }

        [Required]
        public int PocId { get; set; }

        [Required]
        [StringLength(50)]
        public string FirstName { get; set; }

        [StringLength(50)]
        public string MiddleName { get; set; }

        [Required]
        [StringLength(50)]
        public string LastName { get; set; }

        [Required]
        public DateTime DateOfBirth { get; set; }

        [Required]
        [Range(1, 150)]
        public int Age { get; set; }

        [Required]
        [StringLength(15)]
        [RegularExpression(@"^\d{10,15}$")]
        public string PhoneNumber { get; set; }

        public string Address { get; set; }

        [Required]
        [StringLength(12, MinimumLength = 12)]
        [RegularExpression(@"^\d{12}$")]
        public string Aadhaar { get; set; }

        [StringLength(100)]
        public string Occupation { get; set; }

        [Required]
        public string Status { get; set; } = "New";

        [Required]
        [StringLength(100)]
        public string HusbandGuardianName { get; set; }

        [Required]
        [Range(18, 150)]
        public int HusbandGuardianAge { get; set; }
    }

    public class MemberResponse
    {
        public int Id { get; set; }
        public int BranchId { get; set; }
        public int CenterId { get; set; }
        public int PocId { get; set; }
        public string FirstName { get; set; }
        public string MiddleName { get; set; }
        public string LastName { get; set; }
        public DateTime DateOfBirth { get; set; }
        public int Age { get; set; }
        public string PhoneNumber { get; set; }
        public string Address { get; set; }
        public string Aadhaar { get; set; }
        public string Occupation { get; set; }
        public string Status { get; set; }
        public string HusbandGuardianName { get; set; }
        public int HusbandGuardianAge { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class BranchOptionResponse
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Code { get; set; }
    }

    public class CenterOptionResponse
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public int BranchId { get; set; }
    }

    public class POCOptionResponse
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public int BranchId { get; set; }
        public int CenterId { get; set; }
        public string ContactNumber { get; set; }
        public string Email { get; set; }
    }

    public class AadhaarValidationResponse
    {
        public bool IsUnique { get; set; }
        public string Message { get; set; }
    }
}
```

### 3. Member Service

```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using YourProject.Data;
using YourProject.Models;
using YourProject.DTOs;

namespace YourProject.Services
{
    public interface IMemberService
    {
        Task<MemberResponse> CreateMemberAsync(CreateMemberRequest request);
        Task<MemberResponse> UpdateMemberAsync(int memberId, CreateMemberRequest request);
        Task<MemberResponse> GetMemberByIdAsync(int memberId);
        Task<IEnumerable<MemberResponse>> GetMembersByBranchAsync(int branchId);
        Task<bool> DeleteMemberAsync(int memberId);
        Task<bool> IsAadhaarUniqueAsync(string aadhaar, int? excludeMemberId = null);
        Task<IEnumerable<BranchOptionResponse>> GetBranchOptionsAsync();
        Task<IEnumerable<CenterOptionResponse>> GetCentersByBranchAsync(int branchId);
        Task<IEnumerable<POCOptionResponse>> GetPOCsByBranchAndCenterAsync(int branchId, int centerId);
        Task<POCOptionResponse> GetPOCByIdAsync(int pocId);
    }

    public class MemberService : IMemberService
    {
        private readonly ApplicationDbContext _context;

        public MemberService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<MemberResponse> CreateMemberAsync(CreateMemberRequest request)
        {
            // Validate Aadhaar uniqueness
            var aadhaarExists = await _context.Members
                .AnyAsync(m => m.Aadhaar == request.Aadhaar && m.IsActive);

            if (aadhaarExists)
                throw new InvalidOperationException("Aadhaar number already exists");

            // Validate branch exists
            var branchExists = await _context.Branches.AnyAsync(b => b.Id == request.BranchId);
            if (!branchExists)
                throw new InvalidOperationException("Branch not found");

            // Validate center exists and belongs to branch
            var centerExists = await _context.Centers
                .AnyAsync(c => c.Id == request.CenterId && c.BranchId == request.BranchId);
            if (!centerExists)
                throw new InvalidOperationException("Center not found for this branch");

            // Validate POC exists and belongs to branch and center
            var pocExists = await _context.PointOfContacts
                .AnyAsync(p => p.Id == request.PocId 
                    && p.BranchId == request.BranchId 
                    && p.CenterId == request.CenterId);
            if (!pocExists)
                throw new InvalidOperationException("POC not found for this branch and center");

            var member = new Member
            {
                BranchId = request.BranchId,
                CenterId = request.CenterId,
                PocId = request.PocId,
                FirstName = request.FirstName,
                MiddleName = request.MiddleName,
                LastName = request.LastName,
                DateOfBirth = request.DateOfBirth,
                Age = request.Age,
                PhoneNumber = request.PhoneNumber,
                Address = request.Address,
                Aadhaar = request.Aadhaar,
                Occupation = request.Occupation,
                Status = request.Status,
                HusbandGuardianName = request.HusbandGuardianName,
                HusbandGuardianAge = request.HusbandGuardianAge,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Members.Add(member);
            await _context.SaveChangesAsync();

            return MapToResponse(member);
        }

        public async Task<MemberResponse> UpdateMemberAsync(int memberId, CreateMemberRequest request)
        {
            var member = await _context.Members.FindAsync(memberId);
            if (member == null)
                throw new InvalidOperationException("Member not found");

            // Validate Aadhaar uniqueness if changed
            if (member.Aadhaar != request.Aadhaar)
            {
                var aadhaarExists = await _context.Members
                    .AnyAsync(m => m.Aadhaar == request.Aadhaar && m.Id != memberId && m.IsActive);
                if (aadhaarExists)
                    throw new InvalidOperationException("Aadhaar number already exists");
            }

            member.BranchId = request.BranchId;
            member.CenterId = request.CenterId;
            member.PocId = request.PocId;
            member.FirstName = request.FirstName;
            member.MiddleName = request.MiddleName;
            member.LastName = request.LastName;
            member.DateOfBirth = request.DateOfBirth;
            member.Age = request.Age;
            member.PhoneNumber = request.PhoneNumber;
            member.Address = request.Address;
            member.Aadhaar = request.Aadhaar;
            member.Occupation = request.Occupation;
            member.Status = request.Status;
            member.HusbandGuardianName = request.HusbandGuardianName;
            member.HusbandGuardianAge = request.HusbandGuardianAge;
            member.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return MapToResponse(member);
        }

        public async Task<MemberResponse> GetMemberByIdAsync(int memberId)
        {
            var member = await _context.Members.FindAsync(memberId);
            if (member == null)
                throw new InvalidOperationException("Member not found");

            return MapToResponse(member);
        }

        public async Task<IEnumerable<MemberResponse>> GetMembersByBranchAsync(int branchId)
        {
            var members = await _context.Members
                .Where(m => m.BranchId == branchId && m.IsActive)
                .ToListAsync();

            return members.Select(MapToResponse);
        }

        public async Task<bool> DeleteMemberAsync(int memberId)
        {
            var member = await _context.Members.FindAsync(memberId);
            if (member == null)
                throw new InvalidOperationException("Member not found");

            member.IsActive = false;
            member.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> IsAadhaarUniqueAsync(string aadhaar, int? excludeMemberId = null)
        {
            var query = _context.Members.Where(m => m.Aadhaar == aadhaar && m.IsActive);

            if (excludeMemberId.HasValue)
                query = query.Where(m => m.Id != excludeMemberId.Value);

            return !await query.AnyAsync();
        }

        public async Task<IEnumerable<BranchOptionResponse>> GetBranchOptionsAsync()
        {
            var branches = await _context.Branches
                .Where(b => b.IsActive)
                .Select(b => new BranchOptionResponse
                {
                    Id = b.Id,
                    Name = b.Name,
                    Code = b.Code
                })
                .ToListAsync();

            return branches;
        }

        public async Task<IEnumerable<CenterOptionResponse>> GetCentersByBranchAsync(int branchId)
        {
            var centers = await _context.Centers
                .Where(c => c.BranchId == branchId && c.IsActive)
                .Select(c => new CenterOptionResponse
                {
                    Id = c.Id,
                    Name = c.Name,
                    BranchId = c.BranchId
                })
                .ToListAsync();

            return centers;
        }

        public async Task<IEnumerable<POCOptionResponse>> GetPOCsByBranchAndCenterAsync(int branchId, int centerId)
        {
            var pocs = await _context.PointOfContacts
                .Where(p => p.BranchId == branchId && p.CenterId == centerId && p.IsActive)
                .Select(p => new POCOptionResponse
                {
                    Id = p.Id,
                    Name = p.Name,
                    BranchId = p.BranchId,
                    CenterId = p.CenterId,
                    ContactNumber = p.ContactNumber,
                    Email = p.Email
                })
                .ToListAsync();

            return pocs;
        }

        public async Task<POCOptionResponse> GetPOCByIdAsync(int pocId)
        {
            var poc = await _context.PointOfContacts.FindAsync(pocId);
            if (poc == null)
                throw new InvalidOperationException("POC not found");

            return new POCOptionResponse
            {
                Id = poc.Id,
                Name = poc.Name,
                BranchId = poc.BranchId,
                CenterId = poc.CenterId,
                ContactNumber = poc.ContactNumber,
                Email = poc.Email
            };
        }

        private MemberResponse MapToResponse(Member member)
        {
            return new MemberResponse
            {
                Id = member.Id,
                BranchId = member.BranchId,
                CenterId = member.CenterId,
                PocId = member.PocId,
                FirstName = member.FirstName,
                MiddleName = member.MiddleName,
                LastName = member.LastName,
                DateOfBirth = member.DateOfBirth,
                Age = member.Age,
                PhoneNumber = member.PhoneNumber,
                Address = member.Address,
                Aadhaar = member.Aadhaar,
                Occupation = member.Occupation,
                Status = member.Status,
                HusbandGuardianName = member.HusbandGuardianName,
                HusbandGuardianAge = member.HusbandGuardianAge,
                CreatedAt = member.CreatedAt,
                UpdatedAt = member.UpdatedAt
            };
        }
    }
}
```

### 4. Members Controller

```csharp
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YourProject.DTOs;
using YourProject.Services;

namespace YourProject.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(AuthenticationSchemes = "Bearer")]
    public class MembersController : ControllerBase
    {
        private readonly IMemberService _memberService;

        public MembersController(IMemberService memberService)
        {
            _memberService = memberService;
        }

        [HttpGet("options/branches")]
        public async Task<ActionResult<IEnumerable<BranchOptionResponse>>> GetBranchOptions()
        {
            try
            {
                var branches = await _memberService.GetBranchOptionsAsync();
                return Ok(branches);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("centers/branch/{branchId}")]
        public async Task<ActionResult<IEnumerable<CenterOptionResponse>>> GetCentersByBranch(int branchId)
        {
            try
            {
                var centers = await _memberService.GetCentersByBranchAsync(branchId);
                return Ok(centers);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("pocs/branch/{branchId}/center/{centerId}")]
        public async Task<ActionResult<IEnumerable<POCOptionResponse>>> GetPOCsByBranchAndCenter(int branchId, int centerId)
        {
            try
            {
                var pocs = await _memberService.GetPOCsByBranchAndCenterAsync(branchId, centerId);
                return Ok(pocs);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("pocs/{pocId}")]
        public async Task<ActionResult<POCOptionResponse>> GetPOCById(int pocId)
        {
            try
            {
                var poc = await _memberService.GetPOCByIdAsync(pocId);
                return Ok(poc);
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpGet("validate-aadhaar/{aadhaar}")]
        public async Task<ActionResult<AadhaarValidationResponse>> ValidateAadhaar(string aadhaar)
        {
            try
            {
                var isUnique = await _memberService.IsAadhaarUniqueAsync(aadhaar);
                return Ok(new AadhaarValidationResponse
                {
                    IsUnique = isUnique,
                    Message = isUnique ? "Aadhaar is available" : "Aadhaar number already exists"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<ActionResult<MemberResponse>> CreateMember([FromBody] CreateMemberRequest request)
        {
            try
            {
                var member = await _memberService.CreateMemberAsync(request);
                return CreatedAtAction(nameof(GetMemberById), new { id = member.Id }, member);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred: " + ex.Message });
            }
        }

        [HttpPut("{memberId}")]
        public async Task<ActionResult<MemberResponse>> UpdateMember(int memberId, [FromBody] CreateMemberRequest request)
        {
            try
            {
                var member = await _memberService.UpdateMemberAsync(memberId, request);
                return Ok(member);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred: " + ex.Message });
            }
        }

        [HttpGet("{memberId}")]
        public async Task<ActionResult<MemberResponse>> GetMemberById(int memberId)
        {
            try
            {
                var member = await _memberService.GetMemberByIdAsync(memberId);
                return Ok(member);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred: " + ex.Message });
            }
        }

        [HttpGet("branch/{branchId}")]
        public async Task<ActionResult<IEnumerable<MemberResponse>>> GetMembersByBranch(int branchId)
        {
            try
            {
                var members = await _memberService.GetMembersByBranchAsync(branchId);
                return Ok(members);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{memberId}")]
        public async Task<IActionResult> DeleteMember(int memberId)
        {
            try
            {
                await _memberService.DeleteMemberAsync(memberId);
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred: " + ex.Message });
            }
        }
    }
}
```

### 5. Dependency Injection Setup (Startup.cs or Program.cs)

```csharp
// In ConfigureServices or builder.Services
services.AddScoped<IMemberService, MemberService>();

// Update your DbContext if needed
services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(Configuration.GetConnectionString("DefaultConnection")));
```

---

## Integration Steps

1. **Create the Database Table**
   - Execute the SQL script provided in the Database Schema section
   - Ensure all indexes are created

2. **Add NuGet Packages** (if not already present)
   ```
   Microsoft.EntityFrameworkCore
   Microsoft.EntityFrameworkCore.SqlServer
   ```

3. **Create Model, DTO, Service, and Controller Files**
   - Copy and paste the C# code provided above
   - Adjust namespaces as needed

4. **Update Dependency Injection**
   - Register the IMemberService and MemberService in DI container

5. **Add API Routes**
   - Configure the controller routes in your Startup configuration

6. **Test the Endpoints**
   - Use Postman or similar tool to test all endpoints
   - Verify Bearer token authentication is working

7. **Frontend Configuration**
   - Update the `apiUrl` in `member.service.ts` to match your backend URL
   - Test the modal form with the backend

---

## Error Handling

### Validation Errors
```json
{
  "errors": [
    "First Name is required",
    "Phone number format is invalid"
  ],
  "message": "Validation failed"
}
```

### Aadhaar Already Exists
```json
{
  "isUnique": false,
  "message": "Aadhaar number already exists"
}
```

### Authentication Error
```json
{
  "message": "Unauthorized"
}
```

### Server Error
```json
{
  "message": "An error occurred: [Error details]"
}
```

---

## API Base URLs
- **Development**: `http://localhost:5000/api`
- **Production**: Update in `environment.prod.ts`

## Form Validation Rules Summary

| Field | Type | Validation |
|-------|------|-----------|
| Branch Name | Dropdown | Required |
| Center | Dropdown | Required |
| POC | Dropdown | Required |
| POC Contact | Text | Required, Auto-filled |
| First Name | Text | Required, Max 50, Alphanumeric |
| Middle Name | Text | Optional, Max 50, Alphanumeric |
| Last Name | Text | Required, Max 50, Alphanumeric |
| DOB | Date | Required, No Future Dates |
| Age | Number | Required, 1-120, Auto-calculated |
| Phone | Tel | Required, 10-15 digits |
| Address | Textarea | Optional |
| Aadhaar | Tel | Required, Exactly 12 digits, Unique |
| Occupation | Text | Optional, Max 100 |
| Status | Dropdown | Required, Default: New |
| Husband/Guardian Name | Text | Required, Max 100 |
| Husband/Guardian Age | Number | Required, Min 18 |

---

## Notes
- All timestamps are in UTC
- All API endpoints require Bearer token authentication
- Use appropriate HTTP status codes (201 for create, 204 for delete, 400 for validation errors, 401 for auth errors, 404 for not found, 500 for server errors)
- Implement proper logging for debugging
- Add rate limiting to prevent API abuse
