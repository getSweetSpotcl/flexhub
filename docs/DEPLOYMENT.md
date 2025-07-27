# Deployment Guide - FlexHub

## Vercel Deployment

### Prerequisites
1. GitHub repository with the code
2. Vercel account
3. Neon PostgreSQL database
4. Clerk account configured

### Step 1: Connect to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository
4. Select "Next.js" framework (auto-detected)

### Step 2: Configure Environment Variables
Add these environment variables in Vercel:

#### Required Variables
```bash
# Database
DATABASE_URL=postgresql://your-neon-connection-string
DIRECT_URL=postgresql://your-neon-direct-connection-string

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your-key
CLERK_SECRET_KEY=sk_live_your-secret
CLERK_WEBHOOK_SECRET=whsec_your-webhook-secret

# App URLs
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# Cron Jobs
CRON_SECRET=your-secure-random-string
```

#### Optional Variables (for future features)
```bash
# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your-google-maps-key

# Transbank (Production)
TRANSBANK_COMMERCE_CODE=your-commerce-code
TRANSBANK_API_KEY=your-api-key

# File Upload
UPLOADTHING_SECRET=your-uploadthing-secret
UPLOADTHING_APP_ID=your-app-id

# Email
RESEND_API_KEY=your-resend-key

# Real-time
PUSHER_APP_ID=your-pusher-app-id
PUSHER_KEY=your-pusher-key
PUSHER_SECRET=your-pusher-secret
PUSHER_CLUSTER=your-cluster

# Monitoring
SENTRY_DSN=your-sentry-dsn
GOOGLE_SITE_VERIFICATION=your-verification-code
```

### Step 3: Configure Clerk Webhooks
1. Go to Clerk Dashboard → Webhooks
2. Add webhook endpoint: `https://your-domain.com/api/webhooks/clerk`
3. Select events: `user.created`, `user.updated`, `user.deleted`
4. Copy the webhook secret to `CLERK_WEBHOOK_SECRET`

### Step 4: Database Migration
After deployment, run migration:
```bash
pnpm prisma migrate deploy
```

### Step 5: Domain Configuration (Optional)
1. In Vercel Dashboard → Project → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update `NEXT_PUBLIC_APP_URL` environment variable

## Health Checks

- **Health Endpoint**: `https://your-domain.com/api/health`
- **Expected Response**: `{"status": "healthy", "timestamp": "...", "checks": {...}}`

## Monitoring

### Built-in Monitoring
- Vercel Analytics (automatic)
- Function logs in Vercel Dashboard
- Health check endpoint

### Cron Jobs
- Cleanup expired bookings: Runs every 6 hours
- Endpoint: `/api/cron/cleanup-expired-bookings`

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check `DATABASE_URL` format
   - Ensure Neon database is accessible
   - Verify connection pooling settings

2. **Clerk Authentication Issues**
   - Verify all Clerk environment variables
   - Check webhook endpoint configuration
   - Ensure domains match in Clerk settings

3. **Build Failures**
   - Check TypeScript errors: `pnpm typecheck`
   - Verify all dependencies: `pnpm install`
   - Check Prisma generation: `pnpm db:generate`

### Performance Optimization

1. **Database**
   - Use connection pooling (already configured)
   - Monitor slow queries
   - Consider read replicas for scaling

2. **Vercel Functions**
   - Monitor function execution time
   - Use Edge Runtime where possible
   - Implement caching strategies

## Security Checklist

- [ ] All environment variables secured
- [ ] Webhook endpoints protected
- [ ] Rate limiting implemented
- [ ] HTTPS enforced
- [ ] CSP headers configured
- [ ] Sensitive data not in client-side code

## Rollback Procedure

1. Go to Vercel Dashboard → Deployments
2. Select previous working deployment
3. Click "Promote to Production"
4. Verify deployment health

## Support

For deployment issues:
1. Check Vercel function logs
2. Verify health check endpoint
3. Review environment variables
4. Check database connectivity