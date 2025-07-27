#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Checks that all required environment variables and configurations are in place
 */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const requiredEnvVars = [
  'DATABASE_URL',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'NEXT_PUBLIC_APP_URL',
]

const optionalEnvVars = [
  'CLERK_WEBHOOK_SECRET',
  'CRON_SECRET',
  'GOOGLE_SITE_VERIFICATION',
  'SENTRY_DSN',
]

async function checkEnvironmentVariables() {
  console.log('🔍 Checking environment variables...')
  
  const missing = []
  const optional = []
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar)
    } else {
      console.log(`✅ ${envVar}`)
    }
  }
  
  for (const envVar of optionalEnvVars) {
    if (!process.env[envVar]) {
      optional.push(envVar)
    } else {
      console.log(`✅ ${envVar}`)
    }
  }
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:')
    missing.forEach(envVar => console.error(`   - ${envVar}`))
    return false
  }
  
  if (optional.length > 0) {
    console.warn('⚠️  Optional environment variables not set:')
    optional.forEach(envVar => console.warn(`   - ${envVar}`))
  }
  
  return true
}

async function checkDatabaseConnection() {
  console.log('\\n🔍 Checking database connection...')
  
  try {
    await execAsync('npx prisma db push --accept-data-loss')
    console.log('✅ Database connection successful')
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    return false
  }
}

async function checkBuild() {
  console.log('\\n🔍 Checking build...')
  
  try {
    await execAsync('npm run build')
    console.log('✅ Build successful')
    return true
  } catch (error) {
    console.error('❌ Build failed:', error.message)
    return false
  }
}

async function checkLinting() {
  console.log('\\n🔍 Checking linting...')
  
  try {
    await execAsync('npm run lint')
    console.log('✅ Linting passed')
    return true
  } catch (error) {
    console.error('❌ Linting failed:', error.message)
    return false
  }
}

async function checkTypeScript() {
  console.log('\\n🔍 Checking TypeScript...')
  
  try {
    await execAsync('npm run typecheck')
    console.log('✅ TypeScript check passed')
    return true
  } catch (error) {
    console.error('❌ TypeScript check failed:', error.message)
    return false
  }
}

async function main() {
  console.log('🚀 FlexHub - Deployment Verification\\n')
  
  const checks = [
    { name: 'Environment Variables', fn: checkEnvironmentVariables },
    { name: 'Database Connection', fn: checkDatabaseConnection },
    { name: 'TypeScript', fn: checkTypeScript },
    { name: 'Linting', fn: checkLinting },
    { name: 'Build', fn: checkBuild },
  ]
  
  let allPassed = true
  
  for (const check of checks) {
    const passed = await check.fn()
    if (!passed) {
      allPassed = false
    }
  }
  
  console.log('\\n' + '='.repeat(50))
  
  if (allPassed) {
    console.log('✅ All checks passed! Ready for deployment.')
    process.exit(0)
  } else {
    console.log('❌ Some checks failed. Please fix issues before deploying.')
    process.exit(1)
  }
}

main().catch(error => {
  console.error('💥 Verification script failed:', error)
  process.exit(1)
})