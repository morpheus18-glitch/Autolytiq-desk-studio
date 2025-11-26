#!/bin/bash
#
# Run Load Tests
#
# Executes k6 load tests against specified environment and generates reports.
#
# Usage:
#   ./scripts/run-load-tests.sh [scenario] [environment] [options]
#
# Examples:
#   ./scripts/run-load-tests.sh smoke development
#   ./scripts/run-load-tests.sh load staging
#   ./scripts/run-load-tests.sh stress production --ci
#   ./scripts/run-load-tests.sh spike staging --output-dir /tmp/results
#   ./scripts/run-load-tests.sh soak staging --duration 1h
#

set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOAD_TEST_DIR="$PROJECT_ROOT/tests/load"
THRESHOLDS_FILE="$LOAD_TEST_DIR/thresholds.json"

# Default values
SCENARIO="smoke"
ENVIRONMENT="development"
OUTPUT_DIR="$PROJECT_ROOT/tests/load/results"
CI_MODE=false
DURATION_OVERRIDE=""
VUS_OVERRIDE=""
GENERATE_HTML=true
COMPARE_BASELINE=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Environment URLs
declare -A ENV_URLS
ENV_URLS["development"]="http://localhost:8080"
ENV_URLS["staging"]="https://staging-api.autolytiq.example.com"
ENV_URLS["production"]="https://api.autolytiq.example.com"

# Print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Print usage
usage() {
    cat << EOF
Usage: $(basename "$0") [scenario] [environment] [options]

Scenarios:
  smoke     Basic connectivity test (10 users, 1 min)
  load      Normal load test (100 users, 10 min)
  stress    Stress test (500 users, 15 min)
  spike     Spike test (sudden 1000 users)
  soak      Endurance test (50 users, 2 hours)

Environments:
  development   Local development (default: http://localhost:8080)
  staging       Staging environment
  production    Production environment

Options:
  --ci                  Run in CI mode (fail on threshold breach)
  --output-dir DIR      Custom output directory
  --duration TIME       Override test duration (e.g., 5m, 1h)
  --vus NUM             Override VU count
  --no-html             Skip HTML report generation
  --no-baseline         Skip baseline comparison
  --base-url URL        Custom base URL
  --test-user USER      Test user email
  --test-password PASS  Test user password
  --debug               Enable debug mode
  -h, --help            Show this help message

Examples:
  $(basename "$0") smoke development
  $(basename "$0") load staging --ci
  $(basename "$0") stress production --duration 30m --vus 300
  $(basename "$0") soak staging --output-dir /tmp/soak-results

EOF
    exit 0
}

# Parse arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            smoke|load|stress|spike|soak)
                SCENARIO="$1"
                shift
                ;;
            development|staging|production)
                ENVIRONMENT="$1"
                shift
                ;;
            --ci)
                CI_MODE=true
                shift
                ;;
            --output-dir)
                OUTPUT_DIR="$2"
                shift 2
                ;;
            --duration)
                DURATION_OVERRIDE="$2"
                shift 2
                ;;
            --vus)
                VUS_OVERRIDE="$2"
                shift 2
                ;;
            --no-html)
                GENERATE_HTML=false
                shift
                ;;
            --no-baseline)
                COMPARE_BASELINE=false
                shift
                ;;
            --base-url)
                CUSTOM_BASE_URL="$2"
                shift 2
                ;;
            --test-user)
                TEST_USER="$2"
                shift 2
                ;;
            --test-password)
                TEST_PASSWORD="$2"
                shift 2
                ;;
            --debug)
                DEBUG=true
                shift
                ;;
            -h|--help)
                usage
                ;;
            *)
                print_error "Unknown option: $1"
                usage
                ;;
        esac
    done
}

# Check dependencies
check_dependencies() {
    print_info "Checking dependencies..."

    # Check for k6
    if ! command -v k6 &> /dev/null; then
        print_error "k6 is not installed."
        print_info "Install k6: https://k6.io/docs/getting-started/installation/"
        print_info "  macOS: brew install k6"
        print_info "  Linux: sudo gpg -k && sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69 && echo 'deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main' | sudo tee /etc/apt/sources.list.d/k6.list && sudo apt-get update && sudo apt-get install k6"
        exit 1
    fi

    print_success "k6 is installed: $(k6 version)"

    # Check for jq (optional, for JSON processing)
    if ! command -v jq &> /dev/null; then
        print_warning "jq is not installed. Some features may be limited."
    fi
}

# Verify test scenario exists
verify_scenario() {
    local scenario_file="$LOAD_TEST_DIR/scenarios/$SCENARIO.js"

    if [[ ! -f "$scenario_file" ]]; then
        print_error "Scenario file not found: $scenario_file"
        print_info "Available scenarios:"
        ls -1 "$LOAD_TEST_DIR/scenarios/"*.js 2>/dev/null | xargs -I {} basename {} .js
        exit 1
    fi

    print_success "Scenario verified: $SCENARIO"
}

# Prepare output directory
prepare_output_dir() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    RESULTS_DIR="$OUTPUT_DIR/${SCENARIO}_${ENVIRONMENT}_${timestamp}"

    mkdir -p "$RESULTS_DIR"
    print_info "Results will be saved to: $RESULTS_DIR"
}

# Set environment variables
set_env_vars() {
    # Base URL
    if [[ -n "$CUSTOM_BASE_URL" ]]; then
        export BASE_URL="$CUSTOM_BASE_URL"
    else
        export BASE_URL="${ENV_URLS[$ENVIRONMENT]}"
    fi

    # Test credentials
    export TEST_USERNAME="${TEST_USER:-loadtest@example.com}"
    export TEST_PASSWORD="${TEST_PASSWORD:-LoadTest123!}"

    # Environment
    export ENVIRONMENT="$ENVIRONMENT"

    # Debug mode
    if [[ "$DEBUG" == "true" ]]; then
        export DEBUG="true"
    fi

    print_info "Target URL: $BASE_URL"
    print_info "Environment: $ENVIRONMENT"
}

# Health check
health_check() {
    print_info "Performing health check on $BASE_URL..."

    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health" 2>/dev/null || echo "000")

    if [[ "$response" != "200" ]]; then
        print_error "Health check failed. HTTP status: $response"
        print_info "Please ensure the target service is running."
        exit 1
    fi

    print_success "Health check passed (HTTP 200)"
}

# Run k6 test
run_k6_test() {
    local scenario_file="$LOAD_TEST_DIR/scenarios/$SCENARIO.js"
    local json_output="$RESULTS_DIR/results.json"
    local summary_output="$RESULTS_DIR/summary.json"

    print_info "Starting $SCENARIO test..."
    print_info "Scenario: $scenario_file"

    # Build k6 command
    local k6_cmd="k6 run"

    # Output options
    k6_cmd="$k6_cmd --out json=$json_output"
    k6_cmd="$k6_cmd --summary-export=$summary_output"

    # Duration override
    if [[ -n "$DURATION_OVERRIDE" ]]; then
        k6_cmd="$k6_cmd --duration $DURATION_OVERRIDE"
        print_info "Duration override: $DURATION_OVERRIDE"
    fi

    # VUs override
    if [[ -n "$VUS_OVERRIDE" ]]; then
        k6_cmd="$k6_cmd --vus $VUS_OVERRIDE"
        print_info "VUs override: $VUS_OVERRIDE"
    fi

    # Add scenario file
    k6_cmd="$k6_cmd $scenario_file"

    # Execute
    echo ""
    print_info "Executing: $k6_cmd"
    echo "=============================================="

    # Run k6 and capture exit code
    set +e
    eval "$k6_cmd" 2>&1 | tee "$RESULTS_DIR/console.log"
    K6_EXIT_CODE=${PIPESTATUS[0]}
    set -e

    echo "=============================================="

    if [[ $K6_EXIT_CODE -eq 0 ]]; then
        print_success "Test completed successfully"
    else
        print_warning "Test completed with threshold breaches (exit code: $K6_EXIT_CODE)"
    fi

    return $K6_EXIT_CODE
}

# Generate HTML report
generate_html_report() {
    if [[ "$GENERATE_HTML" != "true" ]]; then
        return 0
    fi

    print_info "Generating HTML report..."

    local summary_file="$RESULTS_DIR/summary.json"
    local html_file="$RESULTS_DIR/report.html"

    if [[ ! -f "$summary_file" ]]; then
        print_warning "Summary file not found. Skipping HTML report."
        return 0
    fi

    # Generate HTML report
    cat > "$html_file" << 'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Load Test Report</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: #333; margin-bottom: 20px; }
        h2 { color: #555; margin: 20px 0 10px; border-bottom: 2px solid #ddd; padding-bottom: 5px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .card.success { border-left: 4px solid #28a745; }
        .card.warning { border-left: 4px solid #ffc107; }
        .card.error { border-left: 4px solid #dc3545; }
        .card h3 { font-size: 14px; color: #666; margin-bottom: 5px; }
        .card .value { font-size: 24px; font-weight: bold; color: #333; }
        .card .unit { font-size: 14px; color: #999; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; background: white; border-radius: 8px; overflow: hidden; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        th { background: #f8f9fa; font-weight: 600; }
        tr:hover { background: #f8f9fa; }
        .pass { color: #28a745; }
        .fail { color: #dc3545; }
        .timestamp { color: #999; font-size: 12px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Load Test Report</h1>
        <div class="timestamp" id="timestamp"></div>
        <div class="summary" id="summary"></div>
        <h2>Metrics</h2>
        <table id="metrics">
            <thead>
                <tr>
                    <th>Metric</th>
                    <th>Value</th>
                    <th>p95</th>
                    <th>p99</th>
                    <th>Threshold</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
        <h2>Thresholds</h2>
        <table id="thresholds">
            <thead>
                <tr>
                    <th>Threshold</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    </div>
    <script>
        // This will be populated by the test results
        const data = SUMMARY_DATA_PLACEHOLDER;

        document.getElementById('timestamp').textContent = 'Generated: ' + new Date().toISOString();

        // Summary cards
        const summaryHtml = `
            <div class="card ${data.metrics?.http_req_failed?.values?.rate < 0.01 ? 'success' : 'error'}">
                <h3>Error Rate</h3>
                <div class="value">${((data.metrics?.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}<span class="unit">%</span></div>
            </div>
            <div class="card ${(data.metrics?.http_req_duration?.values?.p95 || 0) < 500 ? 'success' : 'warning'}">
                <h3>p95 Latency</h3>
                <div class="value">${(data.metrics?.http_req_duration?.values?.p95 || 0).toFixed(0)}<span class="unit">ms</span></div>
            </div>
            <div class="card success">
                <h3>Total Requests</h3>
                <div class="value">${(data.metrics?.http_reqs?.values?.count || 0).toLocaleString()}</div>
            </div>
            <div class="card success">
                <h3>RPS</h3>
                <div class="value">${(data.metrics?.http_reqs?.values?.rate || 0).toFixed(1)}</div>
            </div>
        `;
        document.getElementById('summary').innerHTML = summaryHtml;

        // Metrics table
        const metricsBody = document.querySelector('#metrics tbody');
        if (data.metrics) {
            Object.entries(data.metrics).forEach(([name, metric]) => {
                if (metric.type === 'trend' && metric.values) {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${name}</td>
                        <td>${(metric.values.avg || 0).toFixed(2)}</td>
                        <td>${(metric.values['p(95)'] || metric.values.p95 || 0).toFixed(2)}</td>
                        <td>${(metric.values['p(99)'] || metric.values.p99 || 0).toFixed(2)}</td>
                        <td>${metric.thresholds ? Object.keys(metric.thresholds).join(', ') : '-'}</td>
                        <td class="${!metric.thresholds || Object.values(metric.thresholds).every(t => t.ok) ? 'pass' : 'fail'}">${!metric.thresholds || Object.values(metric.thresholds).every(t => t.ok) ? 'PASS' : 'FAIL'}</td>
                    `;
                    metricsBody.appendChild(row);
                }
            });
        }

        // Thresholds table
        const thresholdsBody = document.querySelector('#thresholds tbody');
        if (data.root_group && data.root_group.checks) {
            Object.entries(data.root_group.checks).forEach(([name, check]) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${name}</td>
                    <td class="${check.passes === check.fails + check.passes ? 'pass' : 'fail'}">${check.passes}/${check.fails + check.passes} passed</td>
                `;
                thresholdsBody.appendChild(row);
            });
        }
    </script>
</body>
</html>
HTMLEOF

    # Replace placeholder with actual data
    if command -v jq &> /dev/null; then
        local json_data=$(jq -c '.' "$summary_file")
        sed -i "s/SUMMARY_DATA_PLACEHOLDER/$json_data/" "$html_file" 2>/dev/null || \
        sed -i '' "s/SUMMARY_DATA_PLACEHOLDER/$json_data/" "$html_file"
    else
        sed -i "s/SUMMARY_DATA_PLACEHOLDER/{}/" "$html_file" 2>/dev/null || \
        sed -i '' "s/SUMMARY_DATA_PLACEHOLDER/{}/" "$html_file"
    fi

    print_success "HTML report generated: $html_file"
}

# Compare with baseline
compare_baseline() {
    if [[ "$COMPARE_BASELINE" != "true" ]]; then
        return 0
    fi

    print_info "Comparing with baseline thresholds..."

    local summary_file="$RESULTS_DIR/summary.json"

    if [[ ! -f "$summary_file" ]] || ! command -v jq &> /dev/null; then
        print_warning "Cannot compare baseline. Missing summary file or jq."
        return 0
    fi

    # Extract key metrics and compare
    local p95=$(jq -r '.metrics.http_req_duration.values["p(95)"] // 0' "$summary_file")
    local p99=$(jq -r '.metrics.http_req_duration.values["p(99)"] // 0' "$summary_file")
    local error_rate=$(jq -r '.metrics.http_req_failed.values.rate // 0' "$summary_file")

    echo ""
    echo "Performance Summary:"
    echo "  p95 Latency:  ${p95}ms (threshold: 500ms)"
    echo "  p99 Latency:  ${p99}ms (threshold: 1000ms)"
    echo "  Error Rate:   $(echo "$error_rate * 100" | bc 2>/dev/null || echo "$error_rate")% (threshold: 1%)"

    # Check thresholds
    local threshold_breach=false

    if (( $(echo "$p95 > 500" | bc -l 2>/dev/null || echo "0") )); then
        print_warning "p95 latency exceeds 500ms threshold"
        threshold_breach=true
    fi

    if (( $(echo "$error_rate > 0.01" | bc -l 2>/dev/null || echo "0") )); then
        print_warning "Error rate exceeds 1% threshold"
        threshold_breach=true
    fi

    if [[ "$threshold_breach" == "true" && "$CI_MODE" == "true" ]]; then
        print_error "Threshold breach detected in CI mode"
        return 1
    fi

    return 0
}

# Print summary
print_summary() {
    echo ""
    echo "=============================================="
    echo "LOAD TEST SUMMARY"
    echo "=============================================="
    echo "Scenario:     $SCENARIO"
    echo "Environment:  $ENVIRONMENT"
    echo "Target:       $BASE_URL"
    echo "Results:      $RESULTS_DIR"
    echo ""
    echo "Generated Files:"
    ls -la "$RESULTS_DIR"
    echo "=============================================="
}

# Main execution
main() {
    parse_args "$@"

    echo ""
    echo "=============================================="
    echo "AUTOLYTIQ LOAD TESTING"
    echo "=============================================="
    echo ""

    check_dependencies
    verify_scenario
    prepare_output_dir
    set_env_vars
    health_check

    local exit_code=0
    run_k6_test || exit_code=$?

    generate_html_report
    compare_baseline || exit_code=$?
    print_summary

    if [[ "$CI_MODE" == "true" && $exit_code -ne 0 ]]; then
        print_error "Load test failed in CI mode"
        exit $exit_code
    fi

    exit $exit_code
}

main "$@"
