/**
 * Design System Components
 *
 * Centralized export for all design system components.
 * Import components from this file for consistency.
 *
 * @example
 * ```tsx
 * import { Button, Card, PageHeader } from '@/design-system/components';
 * ```
 */

// Button components
export { Button, ButtonGroup, IconButton, LinkButton, DropdownButton, SplitButton } from './Button';
export type {
  ButtonProps,
  ButtonVariant,
  ButtonSize,
  ButtonGroupProps,
  IconButtonProps,
  LinkButtonProps,
  DropdownButtonProps,
  SplitButtonProps,
} from './Button';

// Card components
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardDivider,
  CardSkeleton,
  CardStats,
} from './Card';
export type {
  CardProps,
  CardVariant,
  CardHeaderProps,
  CardTitleProps,
  CardDescriptionProps,
  CardContentProps,
  CardFooterProps,
  CardDividerProps,
  CardSkeletonProps,
  CardStatsProps,
} from './Card';

// PageHeader components
export { PageHeader, PageHeaderSkeleton, PageHeaderTabs } from './PageHeader';
export type { PageHeaderProps, BreadcrumbItem } from './PageHeader';

// PageContent components
export {
  PageContent,
  PageContentSkeleton,
  PageContentSection,
  PageContentGrid,
  PageContentEmpty,
  PageContentError,
} from './PageContent';
export type { PageContentProps, PageContentLayout } from './PageContent';

// Form components
export { FormInput, FormSelect, FormTextarea, FormCheckbox, FormField } from './forms';
export type {
  FormInputProps,
  FormSelectProps,
  FormSelectOption,
  FormTextareaProps,
  FormCheckboxProps,
  FormFieldProps,
} from './forms';
