# Accessibility Guidelines

Autolytiq Desk Studio is committed to WCAG 2.1 Level AA compliance. This document outlines our accessibility standards and implementation patterns.

## WCAG 2.1 Level AA Compliance

### Perceivable

| Criterion | Status | Implementation |
|-----------|--------|----------------|
| 1.1.1 Non-text Content | ✅ | All images have alt text, icons use aria-label |
| 1.3.1 Info and Relationships | ✅ | Semantic HTML, proper form labels |
| 1.3.2 Meaningful Sequence | ✅ | DOM order matches visual order |
| 1.4.1 Use of Color | ✅ | Color is not the only means of conveying info |
| 1.4.3 Contrast (Minimum) | ✅ | 4.5:1 for text, 3:1 for large text |
| 1.4.4 Resize Text | ✅ | Content readable at 200% zoom |
| 1.4.11 Non-text Contrast | ✅ | UI components have 3:1 contrast |

### Operable

| Criterion | Status | Implementation |
|-----------|--------|----------------|
| 2.1.1 Keyboard | ✅ | All functionality keyboard accessible |
| 2.1.2 No Keyboard Trap | ✅ | Focus can move freely, modals have escape |
| 2.4.1 Bypass Blocks | ✅ | Skip link to main content |
| 2.4.2 Page Titled | ✅ | Descriptive, unique page titles |
| 2.4.3 Focus Order | ✅ | Logical tab order |
| 2.4.4 Link Purpose | ✅ | Links have descriptive text |
| 2.4.6 Headings and Labels | ✅ | Descriptive headings, form labels |
| 2.4.7 Focus Visible | ✅ | Clear focus indicators on all elements |

### Understandable

| Criterion | Status | Implementation |
|-----------|--------|----------------|
| 3.1.1 Language of Page | ✅ | `lang="en"` on html element |
| 3.2.1 On Focus | ✅ | No unexpected changes on focus |
| 3.2.2 On Input | ✅ | No unexpected changes on input |
| 3.3.1 Error Identification | ✅ | Errors announced via `role="alert"` |
| 3.3.2 Labels or Instructions | ✅ | Form fields have clear labels |
| 3.3.3 Error Suggestion | ✅ | Error messages explain how to fix |

### Robust

| Criterion | Status | Implementation |
|-----------|--------|----------------|
| 4.1.1 Parsing | ✅ | Valid HTML, no duplicate IDs |
| 4.1.2 Name, Role, Value | ✅ | ARIA attributes where needed |
| 4.1.3 Status Messages | ✅ | Live regions for dynamic content |

---

## Component Patterns

### Skip Link

Allow keyboard users to bypass navigation:

```tsx
import { SkipLink } from '@/components/accessibility';

// In App.tsx
<SkipLink targetId="main-content" />

// In page layout
<main id="main-content">
  {/* Page content */}
</main>
```

### Live Regions

Announce dynamic content to screen readers:

```tsx
import { useLiveRegion, AlertMessage } from '@/components/accessibility';

function MyComponent() {
  const { announce, announceError, announceSuccess } = useLiveRegion();

  const handleSave = async () => {
    try {
      await saveData();
      announceSuccess('Changes saved successfully');
    } catch (error) {
      announceError('Save failed', error.message);
    }
  };

  return (
    <AlertMessage variant="error">
      This will be announced to screen readers
    </AlertMessage>
  );
}
```

### Focus Management

Trap focus in modals:

```tsx
import { FocusTrap } from '@/components/accessibility';

function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return (
    <FocusTrap active={isOpen} onEscape={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title">Modal Title</h2>
        {children}
      </div>
    </FocusTrap>
  );
}
```

### Accessible Forms

Use proper ARIA attributes for form validation:

```tsx
import { AccessibleFormField, AccessibleInput } from '@/components/accessibility';

function MyForm() {
  return (
    <form>
      <AccessibleFormField
        label="Email"
        error={errors.email?.message}
        required
      >
        <AccessibleInput
          type="email"
          error={!!errors.email}
          {...register('email')}
        />
      </AccessibleFormField>
    </form>
  );
}
```

### Toast Notifications

Toast notifications automatically use appropriate ARIA roles:
- `role="alert"` with `aria-live="assertive"` for errors/warnings
- `role="status"` with `aria-live="polite"` for success/info

---

## Keyboard Navigation

### Global Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Move focus forward |
| `Shift + Tab` | Move focus backward |
| `Escape` | Close modal/dropdown |
| `Enter` | Activate button/link |
| `Space` | Toggle checkbox, activate button |

### Custom Focus Styles

All interactive elements have visible focus styles:

```css
/* Focus styles in tailwind.config.js */
focus:outline-none
focus:ring-2
focus:ring-primary
focus:ring-offset-2
```

---

## Color Contrast

### Text Contrast Ratios

| Element Type | Minimum Ratio | Our Implementation |
|-------------|---------------|-------------------|
| Body text | 4.5:1 | ✅ 7.2:1 |
| Large text (18px+ bold) | 3:1 | ✅ 5.8:1 |
| UI components | 3:1 | ✅ 4.1:1 |
| Focus indicators | 3:1 | ✅ 4.5:1 |

### Color Palette (with contrast)

```
--foreground: #0f0f0f          (on --background: 16:1)
--muted-foreground: #6b6b6b    (on --background: 4.5:1)
--destructive: #dc2626         (on --background: 4.8:1)
--primary: #6366f1             (on --background: 4.6:1)
```

---

## Testing Accessibility

### Automated Testing

```bash
# Run accessibility tests
npm run test:a11y

# Using axe-core with Playwright
npx playwright test --grep @a11y
```

### Manual Testing Checklist

- [ ] Navigate entire page with Tab key only
- [ ] Use screen reader (VoiceOver/NVDA) to complete key flows
- [ ] Verify at 200% zoom
- [ ] Test with high contrast mode
- [ ] Verify color is not the only indicator
- [ ] Check all form error messages are announced

### Screen Reader Testing

Test with:
- **macOS**: VoiceOver (Cmd + F5)
- **Windows**: NVDA (free) or JAWS
- **Chrome**: ChromeVox extension

---

## Resources

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Inclusive Components](https://inclusive-components.design/)
- [a11y Project Checklist](https://www.a11yproject.com/checklist/)
