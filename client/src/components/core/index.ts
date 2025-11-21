/**
 * AUTOLYTIQ CORE COMPONENTS
 * =========================
 *
 * Centralized exports for all core UI components.
 * These components enforce consistent patterns across the application.
 *
 * Usage:
 *   import { PageHeader, PageContent, Section, LoadingState } from '@/components/core';
 */

// Layout Components
export { PageHeader } from './page-header';
export type { PageHeaderProps } from './page-header';

export { PageContent } from './page-content';
export type { PageContentProps } from './page-content';

export { Section } from './section';
export type { SectionProps } from './section';

// State Components
export { LoadingState, LoadingSpinner } from './loading-state';
export type { LoadingStateProps } from './loading-state';

export { ErrorState, InlineError } from './error-state';
export type { ErrorStateProps } from './error-state';

// Interactive Components
export { LoadingButton } from './loading-button';
export type { LoadingButtonProps } from './loading-button';

export { ConfirmDialog, useConfirmDialog } from './confirm-dialog';
export type { ConfirmDialogProps } from './confirm-dialog';
