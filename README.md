# @lamp-motion/react

Headless primitives for origin-aware transitions in React. Focus on the data you need to choreograph contextual animations, then wire it into whatever rendering strategy fits your design system.

## Features

- Hook-first API that captures trigger geometry and lifecycle.
- Framework-agnostic approach: bring your own portal and styling.
- Ships with TypeScript types, Vitest coverage, and tsup bundling.
- Storybook playground to experiment with the hook visually.

## Installation

```bash
npm install @lamp-motion/react
# or
pnpm add @lamp-motion/react
# or
yarn add @lamp-motion/react
```

## Usage

```tsx
import { AnimatePresence, motion } from "framer-motion";
import { useLampMotion } from "@lamp-motion/react";

export function LampyMenu() {
  const { isOpen, origin, open, close, toggle } = useLampMotion();

  return (
    <div>
      <button onClick={(event) => open(event.currentTarget)}>Open menu</button>
      <button onClick={() => toggle()}>Toggle</button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              position: "fixed",
              top: origin?.rect ? origin.rect.bottom + 12 : 140,
              left: origin?.rect ? origin.rect.left : 120,
              transformOrigin: origin?.point ? `${origin.point.x}px ${origin.point.y}px` : "50% 0%"
            }}
          >
            <div role="menu">Put your custom portal or surface here.</div>
            <button onClick={() => close()}>Close</button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
```

## Development

- `pnpm install` – install dependencies.
- `pnpm test` – run Vitest in watch mode.
- `pnpm build` – bundle the package with tsup.
- `pnpm storybook` – launch the Storybook playground for `useLampMotion`.

## Roadmap

1. Polish the hook-based MVP and ship utility helpers for focus/scroll handling.
2. Re-introduce a headless portal composed from the hook once APIs stabilize.
3. Explore View Transition API support and cross-framework adapters.
