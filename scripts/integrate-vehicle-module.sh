#!/bin/bash

# Integration script for vehicle module
# This adds the new vehicle router and preserves legacy routes for reference

set -e

ROUTES_FILE="server/routes.ts"

# Check if already added
if grep -q "createVehicleRouter" "$ROUTES_FILE"; then
  echo "✓ Vehicle router already integrated"
  exit 0
fi

echo "Integrating vehicle module into server/routes.ts..."

# Create backup
cp "$ROUTES_FILE" "$ROUTES_FILE.backup"

# Add vehicle router after customer module using awk
awk '
/app.use\(.*\/api\/customers/ {
  print
  getline
  print
  print ""
  print "  // ============================================================================"
  print "  // VEHICLE & INVENTORY MODULE (NEW MODULAR SYSTEM)"
  print "  // ============================================================================"
  print "  // Import vehicle module with CRUD, VIN decoder, inventory management, stock numbers"
  print "  const { createVehicleRouter } = await import('"'"'../src/modules/vehicle/api/vehicle.routes'"'"');"
  print ""
  print "  // Mount vehicle routes (all require authentication via router middleware)"
  print "  // NOTE: Legacy vehicle routes exist below - this new module takes precedence"
  print "  app.use('"'"'/api/vehicles'"'"', requireAuth, createVehicleRouter());"
  print ""
  next
}
{print}
' "$ROUTES_FILE" > "$ROUTES_FILE.new"

# Replace original
mv "$ROUTES_FILE.new" "$ROUTES_FILE"

echo "✓ Vehicle router mounted at /api/vehicles"
echo "✓ Backup saved as $ROUTES_FILE.backup"
echo ""
echo "NOTE: Legacy vehicle routes still exist in the file for reference."
echo "The new modular router takes precedence due to middleware ordering."
