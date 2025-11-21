# Customer Management Module

Complete customer management system with multi-tenant isolation, fast search, duplicate detection, and comprehensive validation.

## Features

### Core Functionality
- **CRUD Operations**: Create, read, update, and delete customers
- **Multi-Tenant Isolation**: Strict dealership-level data separation
- **Fast Search**: Sub-100ms search with database indexes
- **Duplicate Detection**: Intelligent duplicate customer detection
- **Customer Timeline**: Complete history of deals, emails, and interactions
- **Validation**: Comprehensive data validation and normalization
- **Soft Delete**: Preserves customer history

### Business Requirements Met
- Customers exist independently of deals
- One customer can have multiple deals
- Fast and accurate customer search
- Validated and normalized customer data
- Complete customer history timeline
- Multi-tenant isolation enforced at every level

## Architecture

```
src/modules/customer/
  /types/
    customer.types.ts      # All customer types with Zod validation
  /services/
    customer.service.ts    # Core customer business logic
  /api/
    customer.routes.ts     # REST API endpoints
  /hooks/
    useCustomer.ts         # Single customer data fetching
    useCustomerList.ts     # Customer list with pagination
    useCustomerSearch.ts   # Fast search with debouncing
  /components/
    CustomerCard.tsx       # Customer card component
    CustomerList.tsx       # Customer list view
    CustomerForm.tsx       # Create/edit customer form
    CustomerTimeline.tsx   # Activity timeline
  /utils/
    validators.ts          # Validation and normalization
    formatters.ts          # Display formatting utilities
  index.ts                 # Public API exports
  README.md                # This file
```

## Usage

### Import the Module

```typescript
import {
  // Services
  customerService,

  // Hooks
  useCustomer,
  useCustomerList,
  useCustomerSearch,
  useCreateCustomer,
  useUpdateCustomer,

  // Components
  CustomerCard,
  CustomerList,
  CustomerForm,
  CustomerTimeline,

  // Types
  Customer,
  CreateCustomerRequest,

  // Utilities
  formatPhone,
  getFullName,
  validateCustomerData,
} from '@/modules/customer';
```

### Basic Examples

#### Create a Customer

```typescript
import { useCreateCustomer } from '@/modules/customer';

function CreateCustomerExample() {
  const createCustomer = useCreateCustomer();

  const handleSubmit = async (data) => {
    try {
      const customer = await createCustomer.mutateAsync({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '5551234567',
        status: 'lead',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
        },
      });

      console.log('Customer created:', customer);
    } catch (error) {
      console.error('Error creating customer:', error);
    }
  };

  return <CustomerForm onSubmit={handleSubmit} />;
}
```

#### List Customers

```typescript
import { useCustomerList } from '@/modules/customer';

function CustomerListExample() {
  const { data, isLoading } = useCustomerList({
    status: 'active',
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Customers ({data.total})</h1>
      {data.customers.map(customer => (
        <CustomerCard key={customer.id} customer={customer} />
      ))}
    </div>
  );
}
```

#### Search Customers

```typescript
import { useCustomerSearch } from '@/modules/customer';

function CustomerSearchExample() {
  const [search, setSearch] = useState('');
  const { data: customers } = useCustomerSearch(search);

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search customers..."
      />

      {customers?.map(customer => (
        <CustomerCard key={customer.id} customer={customer} />
      ))}
    </div>
  );
}
```

#### Get Customer with Timeline

```typescript
import { useCustomer, useCustomerTimeline } from '@/modules/customer';

function CustomerDetailsExample({ customerId }) {
  const { data: customer } = useCustomer(customerId);
  const { data: timeline } = useCustomerTimeline(customerId);

  return (
    <div>
      <CustomerCard customer={customer} />
      <CustomerTimeline customerId={customerId} />
    </div>
  );
}
```

## API Endpoints

All endpoints enforce multi-tenant isolation via `dealershipId` from authenticated user.

### Customer CRUD

```
POST   /api/customers              Create customer
GET    /api/customers              List customers with filters
GET    /api/customers/:id          Get single customer
PATCH  /api/customers/:id          Update customer
DELETE /api/customers/:id          Delete customer (soft delete)
```

### Search & Duplicates

```
GET    /api/customers/search           Fast search
POST   /api/customers/find-duplicates  Find duplicate customers
POST   /api/customers/:id/merge        Merge duplicate customers
```

### Customer History

```
GET    /api/customers/:id/timeline     Get customer timeline
GET    /api/customers/:id/deals        Get customer deals
GET    /api/customers/:id/emails       Get customer emails
```

### Validation

```
POST   /api/customers/validate         Validate customer data
```

## Customer Service API

### Core Methods

```typescript
class CustomerService {
  // CRUD
  async createCustomer(data: CreateCustomerRequest, dealershipId: string): Promise<Customer>
  async getCustomer(customerId: string, dealershipId: string): Promise<Customer>
  async updateCustomer(customerId: string, dealershipId: string, data: UpdateCustomerRequest): Promise<Customer>
  async deleteCustomer(customerId: string, dealershipId: string): Promise<void>

  // List & Search
  async listCustomers(query: CustomerListQuery): Promise<PaginatedCustomers>
  async searchCustomers(searchQuery: string, dealershipId: string): Promise<Customer[]>

  // Duplicates
  async findDuplicates(search: DuplicateSearch): Promise<Customer[]>
  async mergeDuplicates(keepId: string, mergeIds: string[], dealershipId: string): Promise<Customer>

  // History
  async getCustomerTimeline(customerId: string, dealershipId: string): Promise<TimelineEvent[]>
  async getCustomerDeals(customerId: string, dealershipId: string): Promise<Deal[]>
  async getCustomerEmails(customerId: string, dealershipId: string): Promise<Email[]>

  // Validation
  async validateCustomer(data: Partial<CreateCustomerRequest>): Promise<ValidationResult>
}
```

## Data Validation

### Automatic Normalization

All customer data is automatically normalized:

- **Phone Numbers**: Converted to E.164 format (+15551234567)
- **Email**: Lowercased and trimmed
- **Names**: Capitalized properly
- **Addresses**: State codes uppercased, ZIP codes formatted
- **Driver's License**: Uppercased alphanumeric

### Validation Rules

```typescript
// Required fields
firstName: string (1-50 chars, no numbers)
lastName: string (1-50 chars, no numbers)
email OR phone: At least one required

// Optional but validated
email: Valid email format
phone: Valid E.164 format (10-15 digits)
zipCode: 5 or 9 digits (US format)
state: Valid 2-letter state code
driversLicense: Alphanumeric, 1-20 chars
ssnLast4: Exactly 4 digits
creditScore: 300-850
```

### Validation Example

```typescript
import { validateCustomerData } from '@/modules/customer';

const validation = validateCustomerData({
  firstName: 'John',
  lastName: 'Doe',
  email: 'invalid-email', // Will fail
  phone: '555-1234', // Will fail (too short)
});

if (!validation.valid) {
  console.log('Errors:', validation.errors);
  // [{ field: 'email', message: 'Invalid email format', code: 'INVALID_FORMAT' }]
}
```

## Duplicate Detection

### Detection Criteria

Customers are considered potential duplicates if they match on:
- **Exact name match** (first + last name)
- **Phone number match**
- **Email match** (case-insensitive)
- **Driver's license match**

### Example

```typescript
import { useFindDuplicates } from '@/modules/customer';

function DuplicateCheckExample() {
  const { data: duplicates } = useFindDuplicates({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+15551234567',
  });

  if (duplicates && duplicates.length > 0) {
    console.log('Found potential duplicates:', duplicates);
  }
}
```

## Performance

### Search Performance

With database indexes, expected performance:
- **Name search**: 10-50ms
- **Email/Phone lookup**: 1-5ms
- **Full-text search**: 20-100ms
- **Duplicate detection**: 5-50ms
- **List with filters**: 10-50ms

### Optimization Tips

1. **Use specific searches**: Email/phone searches are faster than name searches
2. **Limit result sets**: Use pagination (default 20 items)
3. **Debounce search input**: Use 300ms debounce for search (built into `useCustomerSearch`)
4. **Cache results**: React Query caches for 5 minutes by default
5. **Use indexes**: All search fields are indexed

## Multi-Tenant Isolation

**CRITICAL**: Every customer query MUST filter by `dealershipId`.

This is enforced at multiple levels:
1. **Service Layer**: Every method requires `dealershipId` parameter
2. **Database Layer**: All queries filter by `dealership_id`
3. **API Layer**: `dealershipId` extracted from authenticated user
4. **Index Layer**: Compound indexes include `dealership_id` first

### Example

```typescript
// CORRECT - Multi-tenant safe
const customer = await customerService.getCustomer(
  customerId,
  dealershipId // REQUIRED
);

// WRONG - Will throw error
const customer = await customerService.getCustomer(customerId);
```

## Error Handling

### Error Types

```typescript
CustomerNotFoundError       // 404 - Customer not found
CustomerValidationError     // 400 - Validation failed
DuplicateCustomerError      // 409 - Duplicate detected
CustomerAccessDeniedError   // 403 - Access denied
```

### Example

```typescript
import { useCreateCustomer, CustomerValidationError } from '@/modules/customer';

function ErrorHandlingExample() {
  const createCustomer = useCreateCustomer();

  const handleSubmit = async (data) => {
    try {
      await createCustomer.mutateAsync(data);
    } catch (error) {
      if (error.name === 'CustomerValidationError') {
        console.log('Validation errors:', error.validationErrors);
      } else if (error.name === 'DuplicateCustomerError') {
        console.log('Duplicates found:', error.duplicates);
      } else {
        console.error('Unexpected error:', error);
      }
    }
  };
}
```

## Utilities

### Formatters

```typescript
import {
  getFullName,
  formatPhone,
  formatEmail,
  formatAddressSingleLine,
  formatCurrency,
  formatDate,
  formatCustomerStatus,
} from '@/modules/customer';

const fullName = getFullName(customer); // "John Michael Doe Jr."
const phone = formatPhone(customer.phone); // "(555) 123-4567"
const address = formatAddressSingleLine(customer.address); // "123 Main St, New York, NY 10001"
const status = formatCustomerStatus(customer.status); // "Active"
```

### Validators

```typescript
import {
  isValidPhone,
  isValidEmail,
  isValidZipCode,
  normalizePhone,
} from '@/modules/customer';

const valid = isValidPhone('555-123-4567'); // true
const normalized = normalizePhone('555-123-4567'); // "+15551234567"
```

## Testing

### Unit Tests

```typescript
import { customerService } from '@/modules/customer';

describe('CustomerService', () => {
  it('should create customer with normalized data', async () => {
    const customer = await customerService.createCustomer({
      firstName: 'john',
      lastName: 'doe',
      email: 'JOHN@EXAMPLE.COM',
      phone: '555-123-4567',
      status: 'lead',
    }, dealershipId);

    expect(customer.firstName).toBe('John'); // Capitalized
    expect(customer.email).toBe('john@example.com'); // Lowercased
    expect(customer.phone).toBe('+15551234567'); // Normalized
  });
});
```

## Migration

To enable fast search, run the database migration:

```bash
psql $DATABASE_URL < migrations/002_customer_search_indexes.sql
```

This creates:
- Basic indexes (name, email, phone, status)
- Full-text search index
- Duplicate detection indexes
- Multi-tenant compound indexes
- Case-insensitive search indexes

## Future Enhancements

Potential improvements:
- [ ] Customer merge workflow UI
- [ ] Advanced search filters (date ranges, credit score)
- [ ] Customer segmentation and tags
- [ ] Bulk import/export
- [ ] Customer analytics dashboard
- [ ] Email campaign integration
- [ ] SMS integration for contact
- [ ] Credit pull integration
- [ ] Document management (ID uploads)

## Support

For issues or questions about the customer module:
1. Check this README for common patterns
2. Review type definitions in `customer.types.ts`
3. See example usage in the components
4. Check API documentation above
