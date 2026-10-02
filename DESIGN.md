# App design guidance

Apply this guidance to every app created from this template. Design the primary flow at 360–390 px first, then enhance it for larger screens. Show useful app content directly, with clear hierarchy and restrained decoration.

## Typography

- Use sans serif as the default for body copy, navigation, buttons, form fields, labels, tabs, status messages, dialog headings, and repeated content such as app cards or list entry titles.
- Use serif tastefully and sparingly for accents: for example, one short display heading or a small editorial phrase. Most of the screen should remain sans serif. Do not apply serif globally to all headings or repeated cards.
- Build hierarchy with size, weight, spacing, and contrast before adding another font. Keep body text readable and form inputs at least 16 px to avoid iPhone input zoom.
- Prefer system font stacks or locally hosted fonts so the interface remains usable offline. Keep font roles explicit in shared CSS variables.

## App color

- Give each app a coherent color identity that matches its icon, `APP_DETAILS.themeColor`, public catalogue metadata, and PWA `theme_color`.
- Carry the app color into the whole interface, including a tiny tint in the page background. The color is more than a button or link accent.
- Start with roughly 3–6% theme color mixed into a light neutral background. Use an even lighter tint for cards and dialogs, and related tints for borders, fields, and selected controls. Adjust for the actual color and contrast; avoid a saturated page background.
- Derive these surface colors from one theme token where possible. For example, Learning Tracker uses moss green `#466a51`, a subtly tinted `#eff3ef` page, and nearly white cards. Keep the manifest's `background_color` aligned with the page for home-screen launches.
- Preserve readable text, distinguish surfaces, and give controls visible focus. Communicate statuses with labels or icons as well as color; app branding must not obscure error or success states.

## Mobile verification

Keep tap targets at least 44 × 44 px, respect safe areas, let dialogs scroll around the software keyboard, and avoid horizontal overflow. Check populated, empty, and editing states at 360 px and 390 px, then a representative desktop width. Review screenshots and exercise the primary flow with touch and keyboard controls. Follow the accessibility and verification requirements in [AGENTS.md](AGENTS.md).
