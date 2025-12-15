/**
 * Tax Configuration Dashboard
 *
 * Admin interface for managing tax rates, viewing current configurations,
 * and monitoring rate bundle status. This page allows authorized users to:
 * - View current rate bundle metadata
 * - Browse state-by-state rate information
 * - Upload new rate bundles
 * - Monitor rate change history
 */

import { useState, useEffect, type JSX, useCallback } from 'react';
import {
  RefreshCw,
  Upload,
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
  Globe,
  FileJson,
  ChevronDown,
  ChevronRight,
  Search,
  Info,
} from 'lucide-react';
import { MainLayout } from '@/layouts';
import {
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
} from '@design-system';
import { cn } from '@/lib/utils';

// Import tax engine functions (these will work once WASM is built and loaded)
import {
  initTaxEngineWasm,
  isWasmAvailable,
  getRateBundleInfo,
  getStateRateInfo,
  initializeTaxRates,
  getTaxEngineVersion,
  type RateBundleInfo,
  type StateRateInfo,
} from '../../../../shared/autoTaxEngine';

// ============================================================================
// Types
// ============================================================================

interface StateRate {
  stateCode: string;
  stateName: string;
  info: StateRateInfo | null;
  loading: boolean;
}

// State name mapping
const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
};

const ALL_STATES = Object.keys(STATE_NAMES).sort();

// ============================================================================
// Components
// ============================================================================

/**
 * Status Badge Component
 */
function StatusBadge({
  status,
  label
}: {
  status: 'success' | 'warning' | 'error' | 'info';
  label: string;
}): JSX.Element {
  const styles = {
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  };

  const icons = {
    success: CheckCircle2,
    warning: AlertCircle,
    error: AlertCircle,
    info: Info,
  };

  const Icon = icons[status];

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium', styles[status])}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

/**
 * Stat Card Component
 */
function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
}: {
  icon: typeof Database;
  label: string;
  value: string | number;
  subtext?: string;
}): JSX.Element {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-card p-4">
      <div className="rounded-lg bg-primary/10 p-2">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
        {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
      </div>
    </div>
  );
}

/**
 * State Rate Row Component
 */
function StateRateRow({
  state,
  onExpand,
  expanded,
}: {
  state: StateRate;
  onExpand: () => void;
  expanded: boolean;
}): JSX.Element {
  const { stateCode, stateName, info, loading } = state;

  const formatRate = (rate: number | undefined): string => {
    if (rate === undefined) return '-';
    return `${(rate * 100).toFixed(3)}%`;
  };

  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        type="button"
        onClick={onExpand}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-mono text-sm font-medium">{stateCode}</span>
          <span className="text-sm text-muted-foreground">{stateName}</span>
        </div>
        <div className="flex items-center gap-4">
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : info ? (
            <>
              <span className="text-sm font-medium tabular-nums">
                {formatRate(info.combinedRate)}
              </span>
              {info.fromBundle ? (
                <StatusBadge status="success" label="From Bundle" />
              ) : (
                <StatusBadge status="warning" label="Default" />
              )}
            </>
          ) : (
            <StatusBadge status="error" label="Not Found" />
          )}
        </div>
      </button>

      {expanded && info && (
        <div className="bg-muted/30 px-4 py-3 pl-11">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">State Rate</dt>
              <dd className="font-medium tabular-nums">{formatRate(info.stateRate)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Avg Local</dt>
              <dd className="font-medium tabular-nums">{formatRate(info.avgLocalRate)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Max Local</dt>
              <dd className="font-medium tabular-nums">{formatRate(info.maxLocalRate)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Local Tax?</dt>
              <dd className="font-medium">{info.hasLocalVehicleTax ? 'Yes' : 'No'}</dd>
            </div>
            {info.lastUpdated && (
              <div>
                <dt className="text-muted-foreground">Last Updated</dt>
                <dd className="font-medium">{info.lastUpdated}</dd>
              </div>
            )}
            {info.source && (
              <div>
                <dt className="text-muted-foreground">Source</dt>
                <dd className="font-medium">{info.source}</dd>
              </div>
            )}
            {(info.notes || info.note) && (
              <div className="col-span-full">
                <dt className="text-muted-foreground">Notes</dt>
                <dd className="font-medium">{info.notes || info.note}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function TaxConfigurationPage(): JSX.Element {
  const [wasmReady, setWasmReady] = useState(false);
  const [bundleInfo, setBundleInfo] = useState<RateBundleInfo | null>(null);
  const [engineVersion, setEngineVersion] = useState<string>('');
  const [states, setStates] = useState<StateRate[]>([]);
  const [expandedState, setExpandedState] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');

  // Initialize WASM and load state rates
  useEffect(() => {
    async function init() {
      try {
        await initTaxEngineWasm();
        setWasmReady(isWasmAvailable());
        setEngineVersion(getTaxEngineVersion());

        // Get bundle info
        const info = getRateBundleInfo();
        setBundleInfo(info);

        // Initialize states list
        const initialStates: StateRate[] = ALL_STATES.map((code) => ({
          stateCode: code,
          stateName: STATE_NAMES[code] || code,
          info: null,
          loading: false,
        }));
        setStates(initialStates);

        // Load rate info for each state
        const loadedStates = initialStates.map((state) => ({
          ...state,
          info: getStateRateInfo(state.stateCode),
        }));
        setStates(loadedStates);
      } catch (error) {
        console.error('Failed to initialize tax engine:', error);
      }
    }
    void init();
  }, []);

  // Refresh bundle info
  const refreshBundleInfo = useCallback(() => {
    const info = getRateBundleInfo();
    setBundleInfo(info);

    // Reload all state rates
    setStates((prev) =>
      prev.map((state) => ({
        ...state,
        info: getStateRateInfo(state.stateCode),
      }))
    );
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadStatus('uploading');
    setUploadMessage('Uploading and parsing rate bundle...');

    try {
      const text = await file.text();
      const result = await initializeTaxRates(text);

      if (result.success) {
        setUploadStatus('success');
        setUploadMessage(`Loaded ${result.metadata?.stateCount ?? 0} states from ${result.metadata?.bundleId ?? 'bundle'}`);
        refreshBundleInfo();
      } else {
        setUploadStatus('error');
        setUploadMessage(result.error || 'Failed to load rate bundle');
      }
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage(error instanceof Error ? error.message : 'Unknown error');
    }

    // Reset status after delay
    setTimeout(() => {
      setUploadStatus('idle');
      setUploadMessage('');
    }, 5000);
  }, [refreshBundleInfo]);

  // Filter states by search query
  const filteredStates = states.filter((state) =>
    state.stateCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    state.stateName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <PageHeader
        title="Tax Configuration"
        subtitle="Manage tax rates and view current rate bundle status."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Admin' },
          { label: 'Tax Configuration' },
        ]}
      />

      <div className="px-4 pb-6 sm:px-6 lg:px-8 space-y-6">
        {/* Status Banner */}
        {!wasmReady && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  WASM Tax Engine Not Available
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  The Rust WASM tax engine is not loaded. Using TypeScript fallback.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Status */}
        {uploadStatus !== 'idle' && (
          <div
            className={cn(
              'rounded-lg border p-4',
              uploadStatus === 'uploading' && 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
              uploadStatus === 'success' && 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800',
              uploadStatus === 'error' && 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
            )}
          >
            <div className="flex items-center gap-3">
              {uploadStatus === 'uploading' && <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />}
              {uploadStatus === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
              {uploadStatus === 'error' && <AlertCircle className="h-5 w-5 text-red-600" />}
              <p className="text-sm font-medium">{uploadMessage}</p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Database}
            label="Engine Version"
            value={engineVersion || 'N/A'}
            subtext={wasmReady ? 'WASM Loaded' : 'TypeScript Fallback'}
          />
          <StatCard
            icon={Globe}
            label="States Configured"
            value={bundleInfo?.stateCount ?? states.filter((s) => s.info?.found).length}
            subtext={bundleInfo?.loaded ? 'From Bundle' : 'Using Defaults'}
          />
          <StatCard
            icon={FileJson}
            label="Local Jurisdictions"
            value={bundleInfo?.localJurisdictionCount ?? 0}
            subtext="Counties, Cities, Districts"
          />
          <StatCard
            icon={Clock}
            label="Effective Date"
            value={bundleInfo?.effectiveDate ?? 'N/A'}
            subtext={bundleInfo?.generatedAt ? `Generated ${bundleInfo.generatedAt}` : undefined}
          />
        </div>

        {/* Bundle Info Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Rate Bundle Status</CardTitle>
              <CardDescription>
                {bundleInfo?.loaded
                  ? `Bundle ID: ${bundleInfo.bundleId}`
                  : 'No rate bundle loaded - using compiled defaults'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={refreshBundleInfo}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <label htmlFor="bundle-upload">
                <Button variant="default" size="sm" asChild>
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Bundle
                  </span>
                </Button>
              </label>
              <input
                id="bundle-upload"
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </CardHeader>
          <CardContent>
            {bundleInfo?.loaded ? (
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="font-medium text-emerald-800 dark:text-emerald-200">
                      Rate Bundle Active
                    </p>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">
                      {bundleInfo.stateCount} states loaded from {bundleInfo.source || 'bundle'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      Using Default Rates
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Upload a rate bundle JSON file to load current tax rates.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* State Rates Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>State Tax Rates</CardTitle>
                <CardDescription>
                  Browse and verify tax rates for all 50 states + DC
                </CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search states..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {filteredStates.map((state) => (
                <StateRateRow
                  key={state.stateCode}
                  state={state}
                  expanded={expandedState === state.stateCode}
                  onExpand={() =>
                    setExpandedState((prev) =>
                      prev === state.stateCode ? null : state.stateCode
                    )
                  }
                />
              ))}
              {filteredStates.length === 0 && (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  No states match your search
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
