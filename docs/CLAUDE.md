# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `pnpm dev` (uses Turbopack for faster builds)
- **Build**: `pnpm build` (includes Prisma generate)
- **Production server**: `pnpm start`
- **Lint**: `pnpm lint` / `pnpm lint:fix`
- **Format**: `pnpm format` / `pnpm format:check`
- **Type check**: `pnpm typecheck`
- **Database**:
  - Generate Prisma client: `pnpm db:generate`
  - Push schema changes: `pnpm db:push`
  - Create migration: `pnpm db:migrate`
  - Open Prisma Studio: `pnpm db:studio`

## Architecture Overview

**FlexHub** is a coworking space booking platform for Chile built with Next.js 15, featuring:

- **Authentication**: Clerk for user management with custom onboarding and verification system
- **Database**: PostgreSQL with Prisma ORM - comprehensive schema for spaces, bookings, users, reviews
- **Payment**: Integration ready for Chilean providers (Transbank/Flow)
- **Core Features**: Space listings, booking system, user verification (RUT), messaging, reviews
- **Localization**: Spanish (es_CL) focused, Chilean market specific (RUT validation, regions)

## Database Architecture

The application uses a sophisticated Prisma schema with:

- **User System**: Roles (Guest/Host/Admin), verification tiers, trust scores, Chilean RUT support
- **Space Management**: Multiple space types, pricing models, availability tracking, location-based search
- **Booking Flow**: Complete booking lifecycle with payment integration and messaging
- **Verification System**: Document upload and approval workflow for user verification
- **Review System**: Bidirectional reviews with detailed rating categories

## Key Technical Decisions

- **UI Framework**: Next.js 15 App Router with TypeScript and Tailwind CSS v4
- **Styling**: shadcn/ui components (New York style) with Radix UI primitives
- **Fonts**: Geist Sans and Geist Mono from Google Fonts
- **File Upload**: UploadThing integration for document verification
- **Middleware**: Clerk middleware with protected routes configuration
- **No Mock Data**: Always query real database, never use fake/mock data

## Project Structure

- `app/(auth)/` - Authentication pages (login, register, onboarding)
- `app/(dashboard)/` - Protected dashboard pages (profile, verification)
- `app/api/` - API routes (webhooks, health, cron jobs, uploadthing)
- `components/ui/` - shadcn/ui component library
- `components/verification/` - Document upload components
- `lib/actions/` - Server actions for auth and verification
- `lib/validations/` - Zod schemas including RUT validation
- `prisma/` - Database schema and migrations
- `docs/` - Documentation and project planning

## Import Aliases

- `@/components` → `components/`
- `@/lib` → `lib/`
- `@/utils` → `lib/utils`
- `@/ui` → `components/ui/`

## Development Guidelines

- Use `cn()` utility from `@/lib/utils` for conditional class merging
- Follow shadcn/ui patterns for new components
- All database operations should use Prisma client from `@/lib/db`
- User authentication handled via Clerk with `clerkId` references
- Chilean-specific features: RUT validation, regional data, payment providers

## Search and Documentation

- **ALWAYS USE REF FIRST**: When user requests code examples, setup/configuration steps, or library/API documentation, ALWAYS use the ref MCP server first
- Only use context7 when ref doesn't provide adequate answers  
- Store all markdown documentation in `docs/` folder