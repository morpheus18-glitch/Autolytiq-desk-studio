# Vehicle Module

Complete vehicle and inventory management system for automotive dealerships.

## Overview

The Vehicle Module is the core asset tracking system for dealerships. It provides comprehensive functionality for:

- Vehicle inventory management
- VIN validation and decoding (NHTSA API)
- Atomic stock number generation
- Status tracking and history
- Multi-tenant isolation
- Advanced search and filtering
- Inventory analytics

## Architecture

```
vehicle/
├── types/
│   └── vehicle.types.ts        # Zod schemas, types, enums
├── services/
│   ├── vehicle.service.ts      # Core CRUD operations
│   ├── inventory.service.ts    # Inventory tracking
│   ├── vin-decoder.service.ts  # VIN validation/decoding
│   └── stock-number.service.ts # Stock number generation
├── api/
│   └── vehicle.routes.ts       # REST API endpoints
├── hooks/
│   ├── useVehicle.ts          # Single vehicle operations
│   ├── useInventory.ts        # Inventory list operations
│   └── useVinDecoder.ts       # VIN decoding operations
├── components/
│   └── VehicleCard.tsx        # Vehicle display card
├── utils/
│   ├── validators.ts          # VIN/data validation
│   └── formatters.ts          # Display formatting
├── schema.sql                 # Database schema
├── index.ts                   # Public API
└── README.md                  # This file
```

## Key Features

### 1. VIN Validation (ISO 3779 Compliant)

```typescript
import { VINDecoderService } from '@/modules/vehicle';

const vinDecoder = new VINDecoderService();

// Validate VIN format and check digit
const validation = vinDecoder.validateVIN('1HGBH41JXMN109186');
// { valid: true, checkDigitValid: true }

// Decode VIN using NHTSA API
const decoded = await vinDecoder.decodeVIN('1HGBH41JXMN109186');
// {
//   valid: true,
//   vin: '1HGBH41JXMN109186',
//   year: 2021,
//   make: 'Honda',
//   model: 'Accord',
//   trim: 'EX-L',
//   bodyStyle: 'Sedan',
//   ...
// }
```

### 2. Atomic Stock Number Generation

```typescript
import { StockNumberService } from '@/modules/vehicle';

const stockNumberService = new StockNumberService();

// Generate unique stock number
const stockNumber = await stockNumberService.generateStockNumber(dealershipId);
// "25-00042"

// With prefix
const stockNumber = await stockNumberService.generateStockNumber(dealershipId, 'USED');
// "USED-25-00042"

// Custom stock number with validation
const custom = await stockNumberService.createCustomStockNumber(dealershipId, 'SPECIAL-123');
// Throws DuplicateStockNumberError if already exists
```

Stock numbers are generated atomically using database sequences, ensuring no duplicates even under high concurrency.

### 3. Multi-Tenant Isolation

**CRITICAL**: Every operation MUST include dealershipId for security.

```typescript
// CORRECT - dealershipId required
const vehicle = await vehicleService.getVehicle(vehicleId, dealershipId);

// WRONG - will fail
const vehicle = await vehicleService.getVehicle(vehicleId);
```

All database queries filter by dealershipId to prevent cross-dealership data access.

### 4. Vehicle Status Tracking

```typescript
import { VehicleStatus } from '@/modules/vehicle';

// Update status with history tracking
const vehicle = await inventoryService.updateVehicleStatus(
  vehicleId,
  dealershipId,
  VehicleStatus.SOLD,
  userId,
  'Sold to John Smith'
);

// Reserve for deal
const reserved = await inventoryService.reserveVehicle(
  vehicleId,
  dealershipId,
  dealId,
  new Date('2025-12-31'),
  userId
);

// Release reservation
const released = await inventoryService.releaseVehicle(vehicleId, dealershipId, userId);
```

Status changes are tracked in vehicle history with timestamps and user information.

### 5. Advanced Search & Filtering

```typescript
import { useInventory } from '@/modules/vehicle';

const filters = {
  dealershipId,
  status: 'available',
  make: 'Honda',
  yearMin: 2020,
  yearMax: 2024,
  priceMin: 20000,
  priceMax: 35000,
  mileageMax: 50000,
  search: 'Accord',
  page: 1,
  limit: 20,
  sortBy: 'askingPrice',
  sortOrder: 'asc',
};

const { data, isLoading } = useInventory(filters);
```

### 6. Inventory Analytics

```typescript
import { useInventorySummary } from '@/modules/vehicle';

const { data: summary } = useInventorySummary(dealershipId);
// {
//   totalVehicles: 250,
//   availableVehicles: 180,
//   soldVehicles: 70,
//   totalInventoryValue: 4500000,
//   averagePrice: 25000,
//   averageMileage: 35000,
//   byStatus: { available: 180, reserved: 15, ... },
//   byType: { new: 50, used: 180, certified: 20 },
//   byMake: { Honda: 45, Toyota: 38, ... }
// }
```

## Database Schema

### Tables

#### `vehicles`
Main vehicle inventory table with:
- Unique VIN and stock number per dealership
- Full vehicle specifications
- Pricing information
- Status and location tracking
- Photos and features (JSONB)
- Soft delete support

#### `stock_number_sequences`
Atomic sequence generator for stock numbers per dealership.

#### `vehicle_history`
Complete audit log of all vehicle changes:
- Status changes
- Price changes
- Location changes
- Reservations
- Updates

### Indexes

Optimized indexes for common queries:
- Dealership + VIN lookup
- Dealership + stock number lookup
- Status filtering
- Make/model search
- Price/mileage ranges
- Full-text search
- Tag filtering

### Views

- `available_inventory` - Pre-filtered view of available vehicles with age calculations
- `inventory_summary` - Real-time inventory statistics per dealership

## API Endpoints

All endpoints require `dealershipId` query parameter for multi-tenant isolation.

### Vehicle Operations

```
GET    /api/vehicles              # List inventory
GET    /api/vehicles/:id          # Get vehicle
POST   /api/vehicles              # Create vehicle
PATCH  /api/vehicles/:id          # Update vehicle
DELETE /api/vehicles/:id          # Delete vehicle (soft)
```

### Lookups

```
GET    /api/vehicles/vin/:vin            # Get by VIN
GET    /api/vehicles/stock/:stockNumber  # Get by stock number
```

### Status Management

```
POST   /api/vehicles/:id/reserve   # Reserve vehicle
POST   /api/vehicles/:id/release   # Release reservation
PATCH  /api/vehicles/:id/status    # Update status
```

### History & Analytics

```
GET    /api/vehicles/:id/history   # Get history
GET    /api/vehicles/:id/metrics   # Get value metrics
GET    /api/vehicles/summary        # Get inventory summary
```

### Utilities

```
POST   /api/vehicles/decode-vin           # Decode VIN
POST   /api/vehicles/validate-vin         # Validate VIN
POST   /api/vehicles/generate-stock-number # Generate stock number
POST   /api/vehicles/import               # Bulk import
```

## React Hooks

### Single Vehicle

```typescript
import {
  useVehicle,
  useCreateVehicle,
  useUpdateVehicle,
  useDeleteVehicle,
  useVehicleHistory,
} from '@/modules/vehicle';

function VehicleDetail({ vehicleId, dealershipId }) {
  const { data: vehicle, isLoading } = useVehicle(vehicleId, dealershipId);
  const updateVehicle = useUpdateVehicle(vehicleId, dealershipId);
  const deleteVehicle = useDeleteVehicle(dealershipId);

  const handleUpdate = async (data) => {
    await updateVehicle.mutateAsync(data);
  };

  const handleDelete = async () => {
    await deleteVehicle.mutateAsync(vehicleId);
  };

  // ...
}
```

### Inventory List

```typescript
import { useInventory, useInventoryWithPreset } from '@/modules/vehicle';

function InventoryList({ dealershipId }) {
  // Custom filters
  const { data, isLoading } = useInventory({
    dealershipId,
    status: 'available',
    page: 1,
    limit: 20,
  });

  // Or use preset
  const { data: available } = useInventoryWithPreset(dealershipId, 'available');

  // ...
}
```

### VIN Decoding

```typescript
import { useDecodeVIN, useGenerateStockNumber } from '@/modules/vehicle';

function VehicleForm({ dealershipId }) {
  const decodeVIN = useDecodeVIN();
  const generateStockNumber = useGenerateStockNumber(dealershipId);

  const handleVINInput = async (vin: string) => {
    const decoded = await decodeVIN.mutateAsync(vin);
    // Pre-fill form with decoded data
    setFormData({
      year: decoded.year,
      make: decoded.make,
      model: decoded.model,
      // ...
    });
  };

  const handleGenerateStock = async () => {
    const stockNumber = await generateStockNumber.mutateAsync();
    setFormData({ ...formData, stockNumber });
  };

  // ...
}
```

## Type Safety

All types are validated with Zod schemas:

```typescript
import { VehicleSchema, CreateVehicleRequestSchema } from '@/modules/vehicle';

// Runtime validation
const vehicle = VehicleSchema.parse(data);

// Type inference
type Vehicle = z.infer<typeof VehicleSchema>;
```

## Error Handling

Module provides specific error types:

```typescript
import {
  VehicleNotFoundError,
  InvalidVINError,
  DuplicateVINError,
  DuplicateStockNumberError,
  VehicleNotAvailableError,
} from '@/modules/vehicle';

try {
  await vehicleService.createVehicle(dealershipId, data);
} catch (error) {
  if (error instanceof DuplicateVINError) {
    // Handle duplicate VIN
  } else if (error instanceof InvalidVINError) {
    // Handle invalid VIN
  }
}
```

## Utilities

### Validators

```typescript
import { validateVIN, validateStockNumber, isValidVehicleYear } from '@/modules/vehicle';

const vinValid = validateVIN('1HGBH41JXMN109186');
const stockValid = validateStockNumber('25-00042');
const yearValid = isValidVehicleYear(2024);
```

### Formatters

```typescript
import {
  formatVehicleName,
  formatPrice,
  formatMileageWithUnit,
  formatStatus,
  formatDaysInInventory,
} from '@/modules/vehicle';

const name = formatVehicleName(vehicle); // "2024 Honda Accord EX-L"
const price = formatPrice(25000); // "$25,000"
const mileage = formatMileageWithUnit(35000); // "35,000 mi"
const status = formatStatus('available'); // "Available"
const days = formatDaysInInventory(vehicle.createdAt); // "42 days"
```

## Best Practices

### 1. Always Use Dealership ID

```typescript
// CORRECT
const vehicle = await vehicleService.getVehicle(vehicleId, dealershipId);

// WRONG - security violation
const vehicle = await db.query('SELECT * FROM vehicles WHERE id = $1', [vehicleId]);
```

### 2. Validate VIN Before Creating Vehicle

```typescript
const validation = vinDecoder.validateVIN(vin);
if (!validation.valid) {
  throw new InvalidVINError(validation.error);
}
```

### 3. Use Transactions for Status Changes

Status changes are automatically wrapped in transactions by the service layer.

### 4. Cache VIN Decodes

VIN decodes are cached for 24 hours to avoid unnecessary API calls.

### 5. Use Stock Number Service

Never generate stock numbers manually - always use StockNumberService for atomicity.

## Integration Examples

### Creating a Vehicle with VIN Decode

```typescript
import { VehicleService, VINDecoderService } from '@/modules/vehicle';

const vehicleService = new VehicleService();
const vinDecoder = new VINDecoderService();

async function createVehicleFromVIN(dealershipId: string, vin: string) {
  // Decode VIN first
  const decoded = await vinDecoder.decodeVIN(vin);

  // Create vehicle with decoded data
  const vehicle = await vehicleService.createVehicle(dealershipId, {
    vin: decoded.vin,
    year: decoded.year!,
    make: decoded.make!,
    model: decoded.model!,
    trim: decoded.trim,
    type: 'used',
    bodyStyle: 'sedan', // Map from decoded.bodyStyle
    // ... other required fields
  });

  return vehicle;
}
```

### Reserving Vehicle for Deal

```typescript
import { InventoryService } from '@/modules/vehicle';

const inventoryService = new InventoryService();

async function reserveForDeal(
  vehicleId: string,
  dealershipId: string,
  dealId: string
) {
  // Reserve for 7 days
  const reservedUntil = new Date();
  reservedUntil.setDate(reservedUntil.getDate() + 7);

  const vehicle = await inventoryService.reserveVehicle(
    vehicleId,
    dealershipId,
    dealId,
    reservedUntil,
    userId
  );

  return vehicle;
}
```

### Inventory Dashboard

```typescript
import { useInventorySummary, useInventory } from '@/modules/vehicle';

function InventoryDashboard({ dealershipId }: { dealershipId: string }) {
  const { data: summary } = useInventorySummary(dealershipId);
  const { data: available } = useInventoryWithPreset(dealershipId, 'available');

  return (
    <div>
      <h1>Inventory Dashboard</h1>
      <div>
        <div>Total Vehicles: {summary?.totalVehicles}</div>
        <div>Available: {summary?.availableVehicles}</div>
        <div>Total Value: {formatPrice(summary?.totalInventoryValue)}</div>
      </div>
      <VehicleList vehicles={available?.vehicles} />
    </div>
  );
}
```

## Testing

### Unit Tests

```typescript
import { VINDecoderService, StockNumberService } from '@/modules/vehicle';

describe('VINDecoderService', () => {
  it('should validate correct VIN', () => {
    const vinDecoder = new VINDecoderService();
    const result = vinDecoder.validateVIN('1HGBH41JXMN109186');
    expect(result.valid).toBe(true);
  });

  it('should reject invalid VIN', () => {
    const vinDecoder = new VINDecoderService();
    const result = vinDecoder.validateVIN('INVALID');
    expect(result.valid).toBe(false);
  });
});
```

### Integration Tests

```typescript
import { VehicleService } from '@/modules/vehicle';
import { db } from '@server/database/db-service';

describe('VehicleService', () => {
  it('should create vehicle with unique stock number', async () => {
    const vehicleService = new VehicleService();

    const vehicle = await vehicleService.createVehicle(dealershipId, {
      vin: '1HGBH41JXMN109186',
      year: 2021,
      make: 'Honda',
      model: 'Accord',
      type: 'used',
      // ... other fields
    });

    expect(vehicle.stockNumber).toBeDefined();
    expect(vehicle.vin).toBe('1HGBH41JXMN109186');
  });
});
```

## Migration

To add the vehicle module to your database:

```sql
-- Run the schema.sql file
psql -d your_database -f src/modules/vehicle/schema.sql
```

## Security

1. **Multi-tenant isolation**: Every query filters by dealershipId
2. **VIN validation**: Prevents invalid VINs from entering system
3. **Unique constraints**: Prevents duplicate VINs and stock numbers per dealership
4. **Soft deletes**: Vehicles are never permanently deleted
5. **History tracking**: Complete audit log of all changes

## Performance

- Indexed for common queries (dealership, VIN, stock number, status, make/model)
- Full-text search on make/model/trim
- VIN decode caching (24 hour TTL)
- Atomic sequence generation for stock numbers
- Optimized pagination with cursor support

## Roadmap

- [ ] Vehicle photos upload/management
- [ ] Advanced pricing analytics
- [ ] Market value integration (KBB, NADA)
- [ ] Automated VIN decoding on create
- [ ] Excel/CSV import/export
- [ ] Vehicle comparison tool
- [ ] Email alerts for aging inventory
- [ ] Integration with DMS systems

## Support

For issues or questions about the Vehicle Module:
1. Check this README
2. Review `/src/modules/MODULE_ARCHITECTURE.md`
3. Check vehicle module tests
4. Contact module maintainer

## License

Internal use only - Autolytiq DMS
