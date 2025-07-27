#!/bin/bash

# Script to set up Vercel environment variables

echo "🚀 Setting up Vercel environment variables for FlexHub..."

# Production environment variables
vercel env add DATABASE_URL production <<< 'postgresql://neondb_owner:npg_vsaGn7kN2Vxf@ep-purple-cell-aeheyoqv-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
vercel env add NEXT_PUBLIC_APP_URL production <<< 'https://flexhub.vercel.app'
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production <<< 'pk_test_YWJvdmUtbGFjZXdpbmctOS5jbGVyay5hY2NvdW50cy5kZXYk'
vercel env add CLERK_SECRET_KEY production <<< 'sk_test_TC4kZrFGPxA4e0zgNTYCFfVyuiNy4OnhDaCcJa62mJ'
vercel env add CLERK_WEBHOOK_SECRET production <<< 'whsec_placeholder_needs_to_be_configured'
vercel env add NEXT_PUBLIC_CLERK_SIGN_IN_URL production <<< '/login'
vercel env add NEXT_PUBLIC_CLERK_SIGN_UP_URL production <<< '/register'
vercel env add NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL production <<< '/dashboard'
vercel env add NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL production <<< '/onboarding'
vercel env add CRON_SECRET production <<< 'cron_secret_$(openssl rand -base64 32)'

echo "✅ Environment variables configured!"
echo ""
echo "⚠️  IMPORTANT: You need to:"
echo "1. Replace Clerk test keys with production keys from https://dashboard.clerk.com"
echo "2. Configure Clerk webhook endpoint: https://flexhub.vercel.app/api/webhooks/clerk"
echo "3. Update CLERK_WEBHOOK_SECRET with the actual webhook secret"