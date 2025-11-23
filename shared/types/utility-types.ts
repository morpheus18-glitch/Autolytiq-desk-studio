/**
 * Utility Types
 * Common TypeScript utility types for type-safe operations across the codebase
 */

// ============================================================================
// DISCRIMINATED UNION HELPERS
// ============================================================================

/**
 * Create a discriminated union type
 * @example
 * type Shape = DiscriminatedUnion<'type', {
 *   circle: { radius: number };
 *   square: { side: number };
 * }>;
 */
export type DiscriminatedUnion<K extends string, T extends Record<string, unknown>> = {
  [P in keyof T]: T[P] & { [Q in K]: P };
}[keyof T];

// ============================================================================
// PARTIAL & REQUIRED VARIANTS
// ============================================================================

/**
 * Make specific keys required in a partial type
 */
export type PartialWith<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Make specific keys partial in a required type
 */
export type RequiredWith<T, K extends keyof T> = Required<T> & Partial<Pick<T, K>>;

/**
 * Deeply partial type
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

/**
 * Deeply readonly type
 */
export type DeepReadonly<T> = T extends object
  ? {
      readonly [P in keyof T]: DeepReadonly<T[P]>;
    }
  : T;

// ============================================================================
// RECORD & MAPPING TYPES
// ============================================================================

/**
 * Record with string values
 */
export type StringRecord = Record<string, string>;

/**
 * Record with unknown values
 */
export type AnyRecord = Record<string, unknown>;

/**
 * Record with number values
 */
export type NumberRecord = Record<string, number>;

/**
 * Record with boolean values
 */
export type BooleanRecord = Record<string, boolean>;

/**
 * Keyed collection type
 */
export type Keyed<T> = Record<string, T>;

/**
 * Map-like record
 */
export type Map<K extends string | number | symbol, V> = Record<K, V>;

// ============================================================================
// ARRAY & COLLECTION TYPES
// ============================================================================

/**
 * Array element type
 */
export type ArrayElement<T extends readonly unknown[]> = T[number];

/**
 * Extract array from union
 */
export type ExtractArray<T> = T extends (infer U)[] ? U : never;

/**
 * Tuple to union
 */
export type TupleToUnion<T extends readonly unknown[]> = T[number];

/**
 * Flatten array type
 */
export type Flatten<T extends readonly unknown[][]> = T[number][number];

// ============================================================================
// FUNCTION TYPES
// ============================================================================

/**
 * Promise-returning function
 */
export type AsyncFunc<T = unknown> = (...args: unknown[]) => Promise<T>;

/**
 * Callback function
 */
export type Callback<T = void> = (value: T) => void;

/**
 * Error handler callback
 */
export type ErrorCallback = (error: Error) => void;

/**
 * Generic handler
 */
export type Handler<T, R = void> = (value: T) => R;

/**
 * Async handler
 */
export type AsyncHandler<T, R = void> = (value: T) => Promise<R>;

/**
 * Predicate function
 */
export type Predicate<T> = (value: T) => boolean;

/**
 * Async predicate function
 */
export type AsyncPredicate<T> = (value: T) => Promise<boolean>;

/**
 * Transformer function
 */
export type Transformer<T, U> = (value: T) => U;

/**
 * Async transformer function
 */
export type AsyncTransformer<T, U> = (value: T) => Promise<U>;

/**
 * Comparator function
 */
export type Comparator<T> = (a: T, b: T) => number;

/**
 * Type guard function
 */
export interface TypeGuard<T> {
  (value: unknown): value is T;
}

/**
 * Validator function
 */
export type Validator<T> = (value: T) => boolean;

/**
 * Async validator function
 */
export type AsyncValidator<T> = (value: T) => Promise<boolean>;

/**
 * Parser function
 */
export type Parser<T, U> = (input: string) => T | U;

/**
 * Serializer function
 */
export type Serializer<T> = (value: T) => string;

/**
 * Deserializer function
 */
export type Deserializer<T> = (input: string) => T;

// ============================================================================
// OBJECT MANIPULATION TYPES
// ============================================================================

/**
 * Extract specific keys from object type
 */
export type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

/**
 * Exclude specific keys from object type
 */
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

/**
 * Get object keys as a literal union type
 */
export type KeyOf<T extends object> = keyof T & string;

/**
 * Get object values as a union type
 */
export type ValueOf<T extends object> = T[keyof T];

/**
 * Merge two object types
 */
export type Merge<T extends object, U extends object> = Omit<T, keyof U> & U;

/**
 * Make all properties nullable
 */
export type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};

/**
 * Make all properties optional
 */
export type Optional<T> = {
  [P in keyof T]?: T[P];
};

/**
 * Getters object type
 */
export type Getters<T> = {
  [P in keyof T as `get${Capitalize<string & P>}`]: () => T[P];
};

/**
 * Setters object type
 */
export type Setters<T> = {
  [P in keyof T as `set${Capitalize<string & P>}`]: (value: T[P]) => void;
};

/**
 * Extract readonly properties
 */
export type ReadonlyKeys<T> = {
  [P in keyof T]-?: IfEquals<{ [Q in P]: T[P] }, { -readonly [Q in P]: T[P] }, never, P>;
}[keyof T];

/**
 * Extract mutable properties
 */
export type MutableKeys<T> = {
  [P in keyof T]-?: IfEquals<{ [Q in P]: T[P] }, { -readonly [Q in P]: T[P] }, P, never>;
}[keyof T];

/**
 * Helper for conditional equality checks
 */
type IfEquals<X, Y, A, B> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y
  ? 1
  : 2
  ? A
  : B;

// ============================================================================
// CONDITIONAL & INFERENCE TYPES
// ============================================================================

/**
 * Extract constructor return type
 */
export type ConstructorType<T> = T extends new (...args: unknown[]) => infer R ? R : never;

/**
 * Extract function return type
 */
export type ReturnType<T extends (...args: unknown[]) => unknown> = T extends (
  ...args: unknown[]
) => infer R
  ? R
  : never;

/**
 * Extract function parameter types
 */
export type Parameters<T extends (...args: unknown[]) => unknown> = T extends (
  ...args: infer P
) => unknown
  ? P
  : never;

/**
 * Flatten promise type
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * Extract key type
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Conditional type helper
 */
export type If<C extends boolean, T, F> = C extends true ? T : F;

// ============================================================================
// STATUS & STATE TYPES
// ============================================================================

/**
 * Async state machine
 */
export type AsyncState<T> =
  | { state: 'idle'; data: null; error: null }
  | { state: 'loading'; data: null; error: null }
  | { state: 'success'; data: T; error: null }
  | { state: 'error'; data: null; error: Error };

/**
 * Result type (Either/Try)
 */
export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

/**
 * Option type (Maybe)
 */
export type Option<T> = { some: true; value: T } | { some: false };

/**
 * Status with timestamp
 */
export interface Status<T> {
  current: T;
  previous?: T;
  changed: boolean;
  changedAt: Date;
}

/**
 * Async operation result
 */
export interface AsyncOperationResult<T, E = Error> {
  data: T | null;
  error: E | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  retry: () => void;
}

// ============================================================================
// DATABASE & ORM TYPES
// ============================================================================

/**
 * Entity with ID
 */
export interface WithId<T> extends T {
  id: string;
}

/**
 * Entity with timestamps
 */
export interface WithTimestamps {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Entity with soft delete
 */
export interface WithSoftDelete {
  deletedAt: Date | null;
}

/**
 * Entity with audit trail
 */
export interface WithAudit {
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Insert operation type (without ID and timestamps)
 */
export type InsertModel<T extends WithId<any> & WithTimestamps> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Update operation type (all optional)
 */
export type UpdateModel<T> = Partial<Omit<T, 'id' | 'createdAt'>>;

/**
 * Query result with count
 */
export interface QueryResult<T> {
  data: T[];
  count: number;
}

/**
 * Pagination info
 */
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: Pagination;
}

/**
 * Sorting info
 */
export interface SortInfo {
  field: string;
  direction: 'asc' | 'desc';
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
  value?: unknown;
}

/**
 * Validation result
 */
export type ValidationResult = ValidationError[];

/**
 * Validated value wrapper
 */
export interface Validated<T> {
  data: T;
  errors: ValidationError[];
  isValid: boolean;
}

// ============================================================================
// BRANDED TYPES (Nominal typing)
// ============================================================================

/**
 * Create a branded type for nominal typing
 * @example
 * type UserId = Brand<string, 'UserId'>;
 */
export type Brand<T, B> = T & { readonly __brand: B };

/**
 * Extract value from branded type
 */
export type Unbranded<T> = T extends Brand<infer U, unknown> ? U : T;

/**
 * Common branded types
 */
export type UserId = Brand<string, 'UserId'>;
export type DealerId = Brand<string, 'DealerId'>;
export type CustomerId = Brand<string, 'CustomerId'>;
export type DealId = Brand<string, 'DealId'>;
export type VehicleId = Brand<string, 'VehicleId'>;
export type EmailId = Brand<string, 'EmailId'>;
export type Money = Brand<number, 'Money'>;
export type Percentage = Brand<number, 'Percentage'>;

// ============================================================================
// SPECIAL TYPES
// ============================================================================

/**
 * Non-empty array
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Non-null value
 */
export type NonNull<T> = T extends null ? never : T;

/**
 * Non-undefined value
 */
export type NonUndefined<T> = T extends undefined ? never : T;

/**
 * Required non-null
 */
export type RequiredNonNull<T> = {
  [P in keyof T]-?: NonNull<T[P]>;
};

/**
 * Primitive types
 */
export type Primitive = string | number | boolean | null | undefined;

/**
 * JSON-compatible value
 */
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | {
      [key: string]: JSONValue;
    };

/**
 * Plain object
 */
export type PlainObject = {
  [key: string]: unknown;
};

/**
 * Class constructor
 */
export type Constructor<T = unknown> = new (...args: unknown[]) => T;

/**
 * Abstract class constructor
 */
export type AbstractConstructor<T = unknown> = abstract new (...args: unknown[]) => T;
