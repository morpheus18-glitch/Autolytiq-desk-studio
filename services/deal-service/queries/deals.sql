-- name: GetDeal :one
SELECT * FROM deals
WHERE id = $1;

-- name: ListDeals :many
SELECT * FROM deals
ORDER BY created_at DESC;

-- name: ListDealsByDealership :many
SELECT * FROM deals
WHERE dealership_id = $1
ORDER BY created_at DESC;

-- name: ListDealsByCustomer :many
SELECT * FROM deals
WHERE customer_id = $1
ORDER BY created_at DESC;

-- name: ListDealsByStatus :many
SELECT * FROM deals
WHERE status = $1
ORDER BY created_at DESC;

-- name: CreateDeal :one
INSERT INTO deals (
  dealership_id,
  customer_id,
  vehicle_id,
  salesperson_id,
  status,
  deal_type,
  delivery_method,
  delivery_destination_state,
  bill_of_lading,
  tax_state_code,
  tax_jurisdiction_code,
  tax_combined_rate,
  tax_amount,
  sale_price,
  trade_allowance,
  trade_payoff,
  cash_down,
  rebates,
  amount_financed,
  apr,
  term_months,
  monthly_payment,
  residual_value,
  money_factor,
  lease_payment,
  doc_fee,
  other_fees,
  total_due,
  notes
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
  $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
  $21, $22, $23, $24, $25, $26, $27, $28, $29
)
RETURNING *;

-- name: UpdateDeal :one
UPDATE deals
SET
  dealership_id = COALESCE($2, dealership_id),
  customer_id = COALESCE($3, customer_id),
  vehicle_id = COALESCE($4, vehicle_id),
  salesperson_id = COALESCE($5, salesperson_id),
  status = COALESCE($6, status),
  deal_type = COALESCE($7, deal_type),
  delivery_method = COALESCE($8, delivery_method),
  delivery_destination_state = COALESCE($9, delivery_destination_state),
  bill_of_lading = COALESCE($10, bill_of_lading),
  tax_state_code = COALESCE($11, tax_state_code),
  tax_jurisdiction_code = COALESCE($12, tax_jurisdiction_code),
  tax_combined_rate = COALESCE($13, tax_combined_rate),
  tax_amount = COALESCE($14, tax_amount),
  sale_price = COALESCE($15, sale_price),
  trade_allowance = COALESCE($16, trade_allowance),
  trade_payoff = COALESCE($17, trade_payoff),
  cash_down = COALESCE($18, cash_down),
  rebates = COALESCE($19, rebates),
  amount_financed = COALESCE($20, amount_financed),
  apr = COALESCE($21, apr),
  term_months = COALESCE($22, term_months),
  monthly_payment = COALESCE($23, monthly_payment),
  residual_value = COALESCE($24, residual_value),
  money_factor = COALESCE($25, money_factor),
  lease_payment = COALESCE($26, lease_payment),
  doc_fee = COALESCE($27, doc_fee),
  other_fees = COALESCE($28, other_fees),
  total_due = COALESCE($29, total_due),
  notes = COALESCE($30, notes),
  updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateDealStatus :one
UPDATE deals
SET status = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteDeal :exec
DELETE FROM deals
WHERE id = $1;
