package encryption

import (
	"database/sql"
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"strconv"
)

// EncryptedString is a string type that automatically encrypts/decrypts when scanning from/to database
type EncryptedString struct {
	Plaintext string
	encryptor *Encryptor
	isNull    bool
}

// EncryptedInt is an integer type that automatically encrypts/decrypts when scanning from/to database
type EncryptedInt struct {
	Plaintext int
	encryptor *Encryptor
	isNull    bool
}

// EncryptedFloat is a float64 type that automatically encrypts/decrypts when scanning from/to database
type EncryptedFloat struct {
	Plaintext float64
	encryptor *Encryptor
	isNull    bool
}

// PIIField identifies fields that contain PII
type PIIField string

const (
	PIIFieldSSNLast4        PIIField = "ssn_last4"
	PIIFieldDriversLicense  PIIField = "drivers_license_number"
	PIIFieldCreditScore     PIIField = "credit_score"
	PIIFieldMonthlyIncome   PIIField = "monthly_income"
	PIIFieldDateOfBirth     PIIField = "date_of_birth"
	PIIFieldPhone           PIIField = "phone"
	PIIFieldEmail           PIIField = "email"
)

// PIIFields returns the list of all PII field names
func PIIFields() []PIIField {
	return []PIIField{
		PIIFieldSSNLast4,
		PIIFieldDriversLicense,
		PIIFieldCreditScore,
		PIIFieldMonthlyIncome,
		PIIFieldDateOfBirth,
		PIIFieldPhone,
		PIIFieldEmail,
	}
}

// FieldEncryptor wraps an Encryptor with field-specific helpers
type FieldEncryptor struct {
	*Encryptor
}

// NewFieldEncryptor creates a new field encryptor
func NewFieldEncryptor(enc *Encryptor) *FieldEncryptor {
	return &FieldEncryptor{Encryptor: enc}
}

// NewFieldEncryptorFromEnv creates a field encryptor from environment configuration
func NewFieldEncryptorFromEnv() (*FieldEncryptor, error) {
	enc, err := NewEncryptorFromEnv()
	if err != nil {
		return nil, err
	}
	return NewFieldEncryptor(enc), nil
}

// EncryptField encrypts a field value based on its type
func (fe *FieldEncryptor) EncryptField(field PIIField, value interface{}) (string, error) {
	if value == nil {
		return "", nil
	}

	var strValue string
	switch v := value.(type) {
	case string:
		if v == "" {
			return "", nil
		}
		strValue = v
	case int:
		strValue = strconv.Itoa(v)
	case int64:
		strValue = strconv.FormatInt(v, 10)
	case float64:
		strValue = strconv.FormatFloat(v, 'f', -1, 64)
	case *string:
		if v == nil || *v == "" {
			return "", nil
		}
		strValue = *v
	case *int:
		if v == nil {
			return "", nil
		}
		strValue = strconv.Itoa(*v)
	case *float64:
		if v == nil {
			return "", nil
		}
		strValue = strconv.FormatFloat(*v, 'f', -1, 64)
	default:
		return "", fmt.Errorf("unsupported type %T for field %s", value, field)
	}

	return fe.Encrypt(strValue)
}

// DecryptField decrypts a field value and converts to the appropriate type
func (fe *FieldEncryptor) DecryptField(field PIIField, encrypted string) (interface{}, error) {
	if encrypted == "" {
		return nil, nil
	}

	decrypted, err := fe.Decrypt(encrypted)
	if err != nil {
		return nil, err
	}

	// Convert based on field type
	switch field {
	case PIIFieldCreditScore:
		return strconv.Atoi(decrypted)
	case PIIFieldMonthlyIncome:
		return strconv.ParseFloat(decrypted, 64)
	default:
		return decrypted, nil
	}
}

// DecryptString decrypts a field and returns it as a string
func (fe *FieldEncryptor) DecryptString(encrypted string) (string, error) {
	if encrypted == "" {
		return "", nil
	}
	return fe.Decrypt(encrypted)
}

// DecryptInt decrypts a field and returns it as an int
func (fe *FieldEncryptor) DecryptInt(encrypted string) (int, error) {
	if encrypted == "" {
		return 0, nil
	}
	decrypted, err := fe.Decrypt(encrypted)
	if err != nil {
		return 0, err
	}
	return strconv.Atoi(decrypted)
}

// DecryptFloat decrypts a field and returns it as a float64
func (fe *FieldEncryptor) DecryptFloat(encrypted string) (float64, error) {
	if encrypted == "" {
		return 0, nil
	}
	decrypted, err := fe.Decrypt(encrypted)
	if err != nil {
		return 0, err
	}
	return strconv.ParseFloat(decrypted, 64)
}

// DecryptNullableString decrypts a field and returns it as a *string
func (fe *FieldEncryptor) DecryptNullableString(encrypted string) (*string, error) {
	if encrypted == "" {
		return nil, nil
	}
	decrypted, err := fe.Decrypt(encrypted)
	if err != nil {
		return nil, err
	}
	return &decrypted, nil
}

// DecryptNullableInt decrypts a field and returns it as a *int
func (fe *FieldEncryptor) DecryptNullableInt(encrypted string) (*int, error) {
	if encrypted == "" {
		return nil, nil
	}
	decrypted, err := fe.Decrypt(encrypted)
	if err != nil {
		return nil, err
	}
	val, err := strconv.Atoi(decrypted)
	if err != nil {
		return nil, err
	}
	return &val, nil
}

// EncryptedStringField creates an EncryptedString bound to an encryptor
func (fe *FieldEncryptor) EncryptedStringField(value string) *EncryptedString {
	return &EncryptedString{
		Plaintext: value,
		encryptor: fe.Encryptor,
	}
}

// EncryptedIntField creates an EncryptedInt bound to an encryptor
func (fe *FieldEncryptor) EncryptedIntField(value int) *EncryptedInt {
	return &EncryptedInt{
		Plaintext: value,
		encryptor: fe.Encryptor,
	}
}

// EncryptedFloatField creates an EncryptedFloat bound to an encryptor
func (fe *FieldEncryptor) EncryptedFloatField(value float64) *EncryptedFloat {
	return &EncryptedFloat{
		Plaintext: value,
		encryptor: fe.Encryptor,
	}
}

// Scan implements the sql.Scanner interface for EncryptedString
func (e *EncryptedString) Scan(value interface{}) error {
	if value == nil {
		e.isNull = true
		e.Plaintext = ""
		return nil
	}

	var encrypted string
	switch v := value.(type) {
	case string:
		encrypted = v
	case []byte:
		encrypted = string(v)
	default:
		return fmt.Errorf("cannot scan %T into EncryptedString", value)
	}

	if e.encryptor == nil {
		// No encryptor set, store as-is (for testing or plaintext mode)
		e.Plaintext = encrypted
		return nil
	}

	decrypted, err := e.encryptor.Decrypt(encrypted)
	if err != nil {
		return fmt.Errorf("failed to decrypt string: %w", err)
	}

	e.Plaintext = decrypted
	return nil
}

// Value implements the driver.Valuer interface for EncryptedString
func (e EncryptedString) Value() (driver.Value, error) {
	if e.isNull || e.Plaintext == "" {
		return nil, nil
	}

	if e.encryptor == nil {
		return e.Plaintext, nil
	}

	encrypted, err := e.encryptor.Encrypt(e.Plaintext)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt string: %w", err)
	}

	return encrypted, nil
}

// IsNull returns true if the value is null
func (e EncryptedString) IsNull() bool {
	return e.isNull
}

// SetEncryptor sets the encryptor for this field
func (e *EncryptedString) SetEncryptor(enc *Encryptor) {
	e.encryptor = enc
}

// Scan implements the sql.Scanner interface for EncryptedInt
func (e *EncryptedInt) Scan(value interface{}) error {
	if value == nil {
		e.isNull = true
		e.Plaintext = 0
		return nil
	}

	var encrypted string
	switch v := value.(type) {
	case string:
		encrypted = v
	case []byte:
		encrypted = string(v)
	case int64:
		// Direct integer value (unencrypted)
		e.Plaintext = int(v)
		return nil
	default:
		return fmt.Errorf("cannot scan %T into EncryptedInt", value)
	}

	if e.encryptor == nil {
		// Try to parse as plain integer
		val, err := strconv.Atoi(encrypted)
		if err != nil {
			return fmt.Errorf("cannot parse %q as integer: %w", encrypted, err)
		}
		e.Plaintext = val
		return nil
	}

	decrypted, err := e.encryptor.Decrypt(encrypted)
	if err != nil {
		return fmt.Errorf("failed to decrypt int: %w", err)
	}

	val, err := strconv.Atoi(decrypted)
	if err != nil {
		return fmt.Errorf("decrypted value is not an integer: %w", err)
	}

	e.Plaintext = val
	return nil
}

// Value implements the driver.Valuer interface for EncryptedInt
func (e EncryptedInt) Value() (driver.Value, error) {
	if e.isNull {
		return nil, nil
	}

	if e.encryptor == nil {
		return strconv.Itoa(e.Plaintext), nil
	}

	encrypted, err := e.encryptor.Encrypt(strconv.Itoa(e.Plaintext))
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt int: %w", err)
	}

	return encrypted, nil
}

// IsNull returns true if the value is null
func (e EncryptedInt) IsNull() bool {
	return e.isNull
}

// SetEncryptor sets the encryptor for this field
func (e *EncryptedInt) SetEncryptor(enc *Encryptor) {
	e.encryptor = enc
}

// Scan implements the sql.Scanner interface for EncryptedFloat
func (e *EncryptedFloat) Scan(value interface{}) error {
	if value == nil {
		e.isNull = true
		e.Plaintext = 0
		return nil
	}

	var encrypted string
	switch v := value.(type) {
	case string:
		encrypted = v
	case []byte:
		encrypted = string(v)
	case float64:
		// Direct float value (unencrypted)
		e.Plaintext = v
		return nil
	default:
		return fmt.Errorf("cannot scan %T into EncryptedFloat", value)
	}

	if e.encryptor == nil {
		val, err := strconv.ParseFloat(encrypted, 64)
		if err != nil {
			return fmt.Errorf("cannot parse %q as float: %w", encrypted, err)
		}
		e.Plaintext = val
		return nil
	}

	decrypted, err := e.encryptor.Decrypt(encrypted)
	if err != nil {
		return fmt.Errorf("failed to decrypt float: %w", err)
	}

	val, err := strconv.ParseFloat(decrypted, 64)
	if err != nil {
		return fmt.Errorf("decrypted value is not a float: %w", err)
	}

	e.Plaintext = val
	return nil
}

// Value implements the driver.Valuer interface for EncryptedFloat
func (e EncryptedFloat) Value() (driver.Value, error) {
	if e.isNull {
		return nil, nil
	}

	if e.encryptor == nil {
		return strconv.FormatFloat(e.Plaintext, 'f', -1, 64), nil
	}

	encrypted, err := e.encryptor.Encrypt(strconv.FormatFloat(e.Plaintext, 'f', -1, 64))
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt float: %w", err)
	}

	return encrypted, nil
}

// IsNull returns true if the value is null
func (e EncryptedFloat) IsNull() bool {
	return e.isNull
}

// SetEncryptor sets the encryptor for this field
func (e *EncryptedFloat) SetEncryptor(enc *Encryptor) {
	e.encryptor = enc
}

// MarshalJSON implements json.Marshaler for EncryptedString
// Always outputs the plaintext value (encryption is only for storage)
func (e EncryptedString) MarshalJSON() ([]byte, error) {
	if e.isNull {
		return json.Marshal(nil)
	}
	return json.Marshal(e.Plaintext)
}

// UnmarshalJSON implements json.Unmarshaler for EncryptedString
func (e *EncryptedString) UnmarshalJSON(data []byte) error {
	var val *string
	if err := json.Unmarshal(data, &val); err != nil {
		return err
	}
	if val == nil {
		e.isNull = true
		e.Plaintext = ""
	} else {
		e.Plaintext = *val
	}
	return nil
}

// MarshalJSON implements json.Marshaler for EncryptedInt
func (e EncryptedInt) MarshalJSON() ([]byte, error) {
	if e.isNull {
		return json.Marshal(nil)
	}
	return json.Marshal(e.Plaintext)
}

// UnmarshalJSON implements json.Unmarshaler for EncryptedInt
func (e *EncryptedInt) UnmarshalJSON(data []byte) error {
	var val *int
	if err := json.Unmarshal(data, &val); err != nil {
		return err
	}
	if val == nil {
		e.isNull = true
		e.Plaintext = 0
	} else {
		e.Plaintext = *val
	}
	return nil
}

// MarshalJSON implements json.Marshaler for EncryptedFloat
func (e EncryptedFloat) MarshalJSON() ([]byte, error) {
	if e.isNull {
		return json.Marshal(nil)
	}
	return json.Marshal(e.Plaintext)
}

// UnmarshalJSON implements json.Unmarshaler for EncryptedFloat
func (e *EncryptedFloat) UnmarshalJSON(data []byte) error {
	var val *float64
	if err := json.Unmarshal(data, &val); err != nil {
		return err
	}
	if val == nil {
		e.isNull = true
		e.Plaintext = 0
	} else {
		e.Plaintext = *val
	}
	return nil
}

// Ensure interfaces are implemented
var (
	_ sql.Scanner   = (*EncryptedString)(nil)
	_ driver.Valuer = (*EncryptedString)(nil)
	_ sql.Scanner   = (*EncryptedInt)(nil)
	_ driver.Valuer = (*EncryptedInt)(nil)
	_ sql.Scanner   = (*EncryptedFloat)(nil)
	_ driver.Valuer = (*EncryptedFloat)(nil)
	_ json.Marshaler   = (*EncryptedString)(nil)
	_ json.Unmarshaler = (*EncryptedString)(nil)
	_ json.Marshaler   = (*EncryptedInt)(nil)
	_ json.Unmarshaler = (*EncryptedInt)(nil)
	_ json.Marshaler   = (*EncryptedFloat)(nil)
	_ json.Unmarshaler = (*EncryptedFloat)(nil)
)
