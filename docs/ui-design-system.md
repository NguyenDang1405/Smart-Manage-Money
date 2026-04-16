# Design System

Single source of truth for the mobile UI system.

## Files

- [apps/mobile/src/design-system/tokens.ts](/home/dunn/Projects/smart-money-manager/apps/mobile/src/design-system/tokens.ts): base scales for palette, spacing, radii, typography, and shadows.
- [apps/mobile/design-system/theme.ts](/home/dunn/Projects/smart-money-manager/apps/mobile/design-system/theme.ts): semantic light and dark themes built from the base tokens.
- [apps/mobile/src/design-system/README.md](/home/dunn/Projects/smart-money-manager/apps/mobile/src/design-system/README.md): team usage rules and examples.

## Rules

- Use tokens instead of raw hex values or ad hoc spacing.
- Prefer semantic names like `textPrimary`, `surface`, and `border` over raw brand names in screen code.
- Add a token here first, then consume it in screens and shared components.
- Keep spacing, radii, and font sizes consistent across the app.

## Workflow

1. Add or adjust a token in `tokens.ts`.
2. Map it into `theme.ts` if it is a semantic value.
3. Consume it from `@/design-system` in app screens.
4. Validate with lint before merging changes.
