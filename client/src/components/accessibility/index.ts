/**
 * Accessibility Components - Index
 *
 * Centralized exports for all accessibility-related components and hooks.
 *
 * These components implement WCAG 2.1 Level AA requirements:
 * - 1.3.1 Info and Relationships (forms, landmarks)
 * - 2.4.1 Bypass Blocks (skip links)
 * - 2.4.3 Focus Order (focus trap)
 * - 2.4.6 Headings and Labels (form labels)
 * - 2.4.7 Focus Visible (focus styles)
 * - 4.1.3 Status Messages (live regions)
 */

// Skip Link - allows keyboard users to bypass navigation
export { SkipLink } from './SkipLink';

// Live Regions - announce dynamic content to screen readers
export {
  LiveRegionProvider,
  useLiveRegion,
  StatusMessage,
  AlertMessage,
  LoadingAnnouncer,
} from './LiveRegion';

// Focus Management - trap and manage focus for modals
export {
  FocusTrap,
  useFocusManagement,
  useFocusWithin,
} from './FocusTrap';

// Accessible Form Components
export {
  AccessibleFormField,
  AccessibleInput,
  AccessibleSelect,
  AccessibleTextarea,
  useFormAccessibility,
} from './FormAccessibility';

// Visually Hidden - for screen reader only content
export { VisuallyHidden } from './VisuallyHidden';
