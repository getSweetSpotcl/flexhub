# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **REF**: when the user requests code examples, setup or configuration steps, or library/API documentation always use ref mcp server
- **Development server**: `pnpm dev` (uses Turbopack for faster builds)
- **Build**: `pnpm build`
- **Production server**: `pnpm start`
- **Lint**: `pnpm lint`
- **Format**: `pnpm format`
- **Type check**: `pnpm typecheck`

## Architecture Overview

This is a Next.js 15 application using the App Router with TypeScript and Tailwind CSS v4. Key architectural decisions:

- **UI Framework**: Next.js 15 with App Router architecture
- **Styling**: Tailwind CSS v4 with shadcn/ui components (New York style)
- **Component System**: Radix UI primitives with shadcn/ui styling
- **Fonts**: Geist Sans and Geist Mono from Google Fonts
- **Path Aliases**: `@/*` maps to project root for imports
- **Mock Data**: Never use mock or fake data, always create the api and query directly to the database

## Project Structure

- `app/` - Next.js App Router pages and layouts
- `components/ui/` - shadcn/ui component library
- `lib/` - Shared utilities (includes `cn()` for class merging)
- `public/` - Static assets

## Key Configuration

- **TypeScript**: Strict mode enabled with Next.js plugin
- **shadcn/ui**: Configured with New York style, RSC support, and Lucide icons
- **Tailwind**: CSS variables enabled, config in `app/globals.css`
- **Import Aliases**:
  - `@/components` → `components/`
  - `@/lib` → `lib/`
  - `@/utils` → `lib/utils`
  - `@/ui` → `components/ui/`

## Development Notes

- Use the `cn()` utility from `@/lib/utils` for conditional class merging
- Follow shadcn/ui patterns for new components
- Tailwind CSS v4 uses the new CSS-first configuration approach

## Search and Documentation Strategies

- Use ref para buscar documentacion en vez de context7 solo usa context7 cuando no encuentres respuestas usando REF.

## Documentation Management

- Guarda todos los archivos md de documentacion en la carpeta docs