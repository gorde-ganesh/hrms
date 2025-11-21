# Controller Update Guide

This guide provides patterns for updating remaining controllers to use the standardized API response format.

## Import Statements

Add these imports to the top of each controller:

```typescript
import {
  successResponse,
  createdResponse,
  errorResponse,
  noContentResponse,
} from '../utils/response-helper';
import { ERROR_CODES, SUCCESS_CODES } from '../utils/response-codes';
```

## Response Patterns

### Success Response (200)

**Old:**

```typescript
res
  .status(200)
  .json({ data: result, message: 'Success', statusCode: 200, code: 'CODE' });
// OR
res.json(data);
```

**New:**

```typescript
return successResponse(
  res,
  result,
  'Success message',
  SUCCESS_CODES.SUCCESS,
  200
);
```

### Created Response (201)

**Old:**

```typescript
res.status(201).json(createdData);
```

**New:**

```typescript
return createdResponse(
  res,
  createdData,
  'Created successfully',
  SUCCESS_CODES.CREATED
);
```

### No Content Response (204)

**Old:**

```typescript
res.status(204).json({ message: 'Deleted' });
```

**New:**

```typescript
return noContentResponse(res, 'Deleted successfully', SUCCESS_CODES.DELETED);
```

### Error Responses

**Old:**

```typescript
res.status(400).json({ message: 'Error message' });
res.status(500).json({ message: 'Internal Server Error' });
```

**New:**

```typescript
return errorResponse(res, 'Error message', ERROR_CODES.VALIDATION_ERROR, 400);
return errorResponse(
  res,
  'Internal Server Error',
  ERROR_CODES.SERVER_ERROR,
  500
);
```

## Controllers to Update

### High Priority (User-facing)

1. ✅ auth.controller.ts - COMPLETED
2. ⚠️ chat.controller.ts - PARTIALLY DONE (need remaining 8 functions)
3. ✅ employee.controller.ts - COMPLETED
4. ✅ leave.controller.ts - COMPLETED
5. ❌ dashboard.controller.ts
6. ❌ notification.controller.ts
7. ❌ attendence.controller.ts

### Medium Priority

8. ❌ payroll.controller.ts
9. ❌ department.controller.ts
10. ❌ designation.controller.ts
11. ❌ users.controller.ts
12. ❌ leave-balance.controller.ts

### Low Priority

13. ❌ call.controller.ts
14. ❌ huddle.controller.ts
15. ❌ performance.controller.ts
16. ❌ report.controller.ts
17. ❌ global.controller.ts
18. ❌ payroll-components.controller.ts

## Chat Controller Remaining Functions

The following functions in `chat.controller.ts` still need to be updated:

1. `createGroupChat` (lines 365-408)
2. `createChannel` (lines 410-451)
3. `getPublicChannels` (lines 453-482)
4. `joinChannel` (lines 484-534)
5. `leaveChannel` (lines 536-566)
6. `addMember` (lines 568-616)
7. `removeMember` (lines 618-659)
8. `uploadFile` (lines 661-674)

## Example: Complete Function Update

### Before:

```typescript
export const getEmployees = async (req: Request, res: Response) => {
  const employees = await prisma.employee.findMany();
  res.json(employees);
};
```

### After:

```typescript
export const getEmployees = async (req: Request, res: Response) => {
  const employees = await prisma.employee.findMany();
  return successResponse(
    res,
    employees,
    'Employees fetched successfully',
    SUCCESS_CODES.SUCCESS
  );
};
```

## Testing

After updating each controller:

1. Test all endpoints with Postman/Thunder Client
2. Verify response format includes `success`, `statusCode`, `message`, `data`, `code`
3. Test error scenarios to ensure proper error responses
4. Update frontend components if they directly access response properties
