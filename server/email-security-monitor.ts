/**
 * EMAIL SECURITY MONITORING & ALERTING
 *
 * Real-time monitoring and alerting for email security events.
 * Integrates with the audit logging system to detect and respond to threats.
 *
 * Features:
 * - Real-time threat detection
 * - Automatic alerting for critical events
 * - Security metrics and dashboards
 * - Automated response actions
 */

import {
  getSecurityEvents,
  logSecurityEvent,
  type EmailSecurityEvent,
} from './email-security';

// ============================================================================
// ALERTING CONFIGURATION
// ============================================================================

export interface AlertConfig {
  // Webhook URL for alerts (e.g., Slack, Discord, PagerDuty)
  webhookUrl?: string;

  // Email addresses for critical alerts
  alertEmails?: string[];

  // Minimum severity level to trigger alerts
  minSeverity: 'low' | 'medium' | 'high' | 'critical';

  // Enable/disable alerting
  enabled: boolean;
}

const defaultAlertConfig: AlertConfig = {
  minSeverity: 'high',
  enabled: process.env.NODE_ENV === 'production',
};

let alertConfig = { ...defaultAlertConfig };

/**
 * Update alert configuration
 */
export function configureAlerting(config: Partial<AlertConfig>) {
  alertConfig = { ...alertConfig, ...config };
}

// ============================================================================
// THREAT DETECTION
// ============================================================================

export interface ThreatPattern {
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detector: (events: EmailSecurityEvent[]) => boolean;
  response?: (events: EmailSecurityEvent[]) => void;
}

/**
 * Common threat patterns
 */
const threatPatterns: ThreatPattern[] = [
  {
    name: 'Phishing Campaign',
    description: 'Multiple phishing attempts detected',
    severity: 'critical',
    detector: (events) => {
      const recentPhishing = events.filter(
        e => e.action === 'email_send_blocked' &&
        e.details.reasons?.some((r: string) => r.includes('phishing'))
      );
      return recentPhishing.length >= 5;
    },
  },
  {
    name: 'Rate Limit Abuse',
    description: 'User repeatedly hitting rate limits',
    severity: 'high',
    detector: (events) => {
      const rateLimitEvents = events.filter(
        e => e.action === 'email_send_rate_limited'
      );
      return rateLimitEvents.length >= 3;
    },
  },
  {
    name: 'XSS Attack Pattern',
    description: 'Multiple XSS attempts detected',
    severity: 'high',
    detector: (events) => {
      const xssEvents = events.filter(
        e => e.action === 'email_send_warning' &&
        e.details.warnings?.some((w: string) => w.includes('dangerous HTML'))
      );
      return xssEvents.length >= 3;
    },
  },
  {
    name: 'Account Compromise',
    description: 'Unusual activity pattern suggesting account compromise',
    severity: 'critical',
    detector: (events) => {
      // Multiple failed attempts followed by sudden high activity
      const failedEvents = events.filter(e => e.action === 'email_send_blocked');
      const successEvents = events.filter(e => e.action === 'email_sent');

      return failedEvents.length >= 3 && successEvents.length >= 10;
    },
  },
];

/**
 * Analyze recent events for threat patterns
 */
export function detectThreats(timeWindowMs: number = 3600000): {
  threats: Array<ThreatPattern & { matchedEvents: EmailSecurityEvent[] }>;
  totalEvents: number;
} {
  const allEvents = getSecurityEvents({ limit: 1000 });
  const cutoffTime = Date.now() - timeWindowMs;

  const recentEvents = allEvents.filter(
    e => e.timestamp.getTime() >= cutoffTime
  );

  const threats = threatPatterns
    .map(pattern => ({
      ...pattern,
      matchedEvents: recentEvents.filter(e => {
        try {
          return pattern.detector([e]);
        } catch (error) {
          console.error(`Error in threat detector ${pattern.name}:`, error);
          return false;
        }
      }),
    }))
    .filter(t => t.matchedEvents.length > 0 || t.detector(recentEvents));

  return {
    threats,
    totalEvents: recentEvents.length,
  };
}

// ============================================================================
// ALERTING
// ============================================================================

/**
 * Send alert notification
 */
async function sendAlert(event: EmailSecurityEvent, threatPattern?: ThreatPattern) {
  if (!alertConfig.enabled) {
    return;
  }

  const severityLevels = { low: 0, medium: 1, high: 2, critical: 3 };
  const eventSeverity = severityLevels[event.severity];
  const minSeverity = severityLevels[alertConfig.minSeverity];

  if (eventSeverity < minSeverity) {
    return;
  }

  const alertMessage = formatAlertMessage(event, threatPattern);

  // Send to webhook (Slack, Discord, etc.)
  if (alertConfig.webhookUrl) {
    try {
      await fetch(alertConfig.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: alertMessage,
          severity: event.severity,
          timestamp: event.timestamp,
        }),
      });
    } catch (error) {
      console.error('[Email Security Alert] Failed to send webhook alert:', error);
    }
  }

  // Console logging for development
  console.error('[EMAIL SECURITY ALERT]', alertMessage);

  // In production, you would also:
  // - Send emails via Resend
  // - Create PagerDuty incidents
  // - Log to external monitoring service (Sentry, DataDog)
}

/**
 * Format alert message
 */
function formatAlertMessage(
  event: EmailSecurityEvent,
  threatPattern?: ThreatPattern
): string {
  const lines = [
    `🚨 EMAIL SECURITY ALERT [${event.severity.toUpperCase()}]`,
    '',
    `Action: ${event.action}`,
    `User: ${event.userId}`,
    `Dealership: ${event.dealershipId}`,
    `Time: ${event.timestamp.toISOString()}`,
  ];

  if (threatPattern) {
    lines.push('', `Threat Pattern: ${threatPattern.name}`, `Description: ${threatPattern.description}`);
  }

  if (event.details) {
    lines.push('', 'Details:', JSON.stringify(event.details, null, 2));
  }

  if (event.ipAddress) {
    lines.push(`IP: ${event.ipAddress}`);
  }

  return lines.join('\n');
}

/**
 * Monitor security events and trigger alerts
 */
export function monitorSecurityEvents() {
  // Check for threats every 5 minutes
  setInterval(() => {
    const { threats } = detectThreats();

    threats.forEach(threat => {
      if (threat.matchedEvents.length > 0) {
        // Create a consolidated alert event
        const alertEvent: EmailSecurityEvent = {
          timestamp: new Date(),
          userId: 'system',
          dealershipId: 'system',
          action: 'threat_detected',
          severity: threat.severity,
          details: {
            threatName: threat.name,
            threatDescription: threat.description,
            matchedEventsCount: threat.matchedEvents.length,
            affectedUsers: [...new Set(threat.matchedEvents.map(e => e.userId))],
          },
        };

        logSecurityEvent(alertEvent);
        sendAlert(alertEvent, threat);

        // Execute response action if defined
        if (threat.response) {
          threat.response(threat.matchedEvents);
        }
      }
    });
  }, 5 * 60 * 1000); // 5 minutes

  console.log('[Email Security Monitor] Monitoring started');
}

// ============================================================================
// SECURITY METRICS
// ============================================================================

export interface SecurityMetrics {
  totalEvents: number;
  eventsByAction: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  topUsers: Array<{ userId: string; eventCount: number }>;
  topDealerships: Array<{ dealershipId: string; eventCount: number }>;
  phishingAttempts: number;
  blockedEmails: number;
  rateLimitHits: number;
  xssAttempts: number;
}

/**
 * Calculate security metrics for a time window
 */
export function getSecurityMetrics(timeWindowMs: number = 86400000): SecurityMetrics {
  const allEvents = getSecurityEvents({ limit: 10000 });
  const cutoffTime = Date.now() - timeWindowMs;

  const recentEvents = allEvents.filter(
    e => e.timestamp.getTime() >= cutoffTime
  );

  const metrics: SecurityMetrics = {
    totalEvents: recentEvents.length,
    eventsByAction: {},
    eventsBySeverity: {},
    topUsers: [],
    topDealerships: [],
    phishingAttempts: 0,
    blockedEmails: 0,
    rateLimitHits: 0,
    xssAttempts: 0,
  };

  // Count events by action
  recentEvents.forEach(e => {
    metrics.eventsByAction[e.action] = (metrics.eventsByAction[e.action] || 0) + 1;
    metrics.eventsBySeverity[e.severity] = (metrics.eventsBySeverity[e.severity] || 0) + 1;
  });

  // Specific metrics
  metrics.phishingAttempts = recentEvents.filter(
    e => e.details.phishingScore || e.details.phishingFlags
  ).length;

  metrics.blockedEmails = recentEvents.filter(
    e => e.action === 'email_send_blocked'
  ).length;

  metrics.rateLimitHits = recentEvents.filter(
    e => e.action === 'email_send_rate_limited'
  ).length;

  metrics.xssAttempts = recentEvents.filter(
    e => e.details.warnings?.some((w: string) => w.includes('dangerous HTML'))
  ).length;

  // Top users
  const userCounts = new Map<string, number>();
  recentEvents.forEach(e => {
    userCounts.set(e.userId, (userCounts.get(e.userId) || 0) + 1);
  });
  metrics.topUsers = Array.from(userCounts.entries())
    .map(([userId, eventCount]) => ({ userId, eventCount }))
    .sort((a, b) => b.eventCount - a.eventCount)
    .slice(0, 10);

  // Top dealerships
  const dealershipCounts = new Map<string, number>();
  recentEvents.forEach(e => {
    dealershipCounts.set(e.dealershipId, (dealershipCounts.get(e.dealershipId) || 0) + 1);
  });
  metrics.topDealerships = Array.from(dealershipCounts.entries())
    .map(([dealershipId, eventCount]) => ({ dealershipId, eventCount }))
    .sort((a, b) => b.eventCount - a.eventCount)
    .slice(0, 10);

  return metrics;
}

// ============================================================================
// AUTOMATED RESPONSE ACTIONS
// ============================================================================

/**
 * Automatically block user if suspicious activity is detected
 */
export function autoBlockUser(userId: string, reason: string) {
  logSecurityEvent({
    timestamp: new Date(),
    userId,
    dealershipId: 'system',
    action: 'user_auto_blocked',
    severity: 'critical',
    details: { reason },
  });

  // In production, you would:
  // - Update user status in database
  // - Revoke active sessions
  // - Send notification to admin
  console.warn(`[Email Security] User ${userId} auto-blocked: ${reason}`);
}

/**
 * Quarantine suspicious email
 */
export function quarantineEmail(emailId: string, reason: string) {
  logSecurityEvent({
    timestamp: new Date(),
    userId: 'system',
    dealershipId: 'system',
    action: 'email_quarantined',
    severity: 'high',
    details: { emailId, reason },
  });

  // In production, you would:
  // - Move email to quarantine folder
  // - Prevent delivery
  // - Alert security team
  console.warn(`[Email Security] Email ${emailId} quarantined: ${reason}`);
}

// ============================================================================
// EXPORT MONITORING API
// ============================================================================

export const EmailSecurityMonitor = {
  configure: configureAlerting,
  start: monitorSecurityEvents,
  detectThreats,
  getMetrics: getSecurityMetrics,
  autoBlockUser,
  quarantineEmail,
};
