# Carplog-Pro - Product Requirements Document

## Overview
Carplog-Pro is a personal carp fishing diary PWA (Progressive Web App) that allows anglers to log their catches, track statistics, and manage their fishing profile. It can be installed on phones like a native app.

## Tech Stack
- **Frontend**: React.js with Tailwind CSS (PWA enabled)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: JWT-based

## Core Features

### 1. User Authentication
- Email/password registration and login
- JWT token-based authentication
- **Remember Me**: Saves login credentials to localStorage for convenience
- Profile management with angler details and gear setup

### 2. Catch Logging
- Log catches with: fish name, weight, length, venue, peg, wraps, bait, notes, photo
- **Weight Input**: 
  - kg mode: Single decimal input
  - lb/oz mode: Separate lb and oz fields for precise imperial measurements
- **Date Selection**: Supports full 2026 date range (Jan 1 - Dec 31, 2026)

### 3. Dashboard
- Monthly catch overview with filters
- Quick stats: catch count, total weight, average weight, biggest catch
- Unit toggle: kg or lb/oz display format
- **Year Selector**: 2026 onwards only

### 4. Statistics
- Monthly breakdown view
- Yearly comparison view
- All weights display in lb/oz format when imperial unit selected

### 5. Analytics Dashboard
- Total visits tracking
- Unique visitors count
- App installs tracking
- Catches logged count
- Device breakdown (mobile/desktop)
- Page views breakdown
- Daily visits chart (last 30 days)

### 6. PWA Features
- Installable on phones (Add to Home Screen)
- Works offline (basic caching)
- App icons for all device sizes
- Standalone display mode

### 7. Profile
- Personal info (name, age, years angling, bio)
- Gear setup (rods, reels, alarms, bobbins, bivvy, etc.)
- Line setup (mainline, hooklink, breaking strains)
- Preferences (favorite brands, baits, rigs)
- Fishing locations (home waters, favorite venues)

## What's Been Implemented

### January 31, 2026
1. **Weight Display Format**: Changed from decimal lb to lb/oz format
2. **Separate lb/oz Input**: Add Catch form shows two separate fields for lb and oz
3. **Remember Me Checkbox**: Login form saves credentials to localStorage
4. **Year Restriction**: Year selector shows 2026 onwards only
5. **Date Range**: Date picker allows any date in 2026
6. **PWA Conversion**: App is now installable on phones
7. **Analytics Dashboard**: Custom tracker showing visits, installs, page views, device breakdown

## Free Hosting Options

### Option 1: Vercel (Recommended for Frontend)
- Free tier: Unlimited deployments
- Custom domains supported
- Automatic HTTPS
- Great for React apps

### Option 2: Railway
- Free tier: $5/month credit
- Supports both frontend and backend
- MongoDB hosting available

### Option 3: Render
- Free tier available
- Supports Python backends
- Auto-deploys from GitHub

### Option 4: MongoDB Atlas
- Free tier: 512MB storage
- Perfect for small apps
- Use with any backend host

## Deployment Guide
1. Save code to GitHub using "Save to Github" feature
2. Create accounts on Vercel + MongoDB Atlas (both free)
3. Deploy frontend to Vercel
4. Deploy backend to Railway or Render
5. Connect to MongoDB Atlas database
6. Share the Vercel URL with friends!

## User Personas
- **Recreational Carp Anglers**: Want to track their catches and see progress
- **Competitive Anglers**: Need detailed statistics and catch records
- **Social Anglers**: Want to share catch photos and achievements

## Prioritized Backlog

### P0 - Critical
- None currently

### P1 - High Priority
- Export catches to CSV/PDF
- Photo gallery view

### P2 - Medium Priority
- Weather integration for catches
- Map integration for venues
- Social sharing features

### P3 - Low Priority
- AI-powered bait recommendations
- Catch prediction based on conditions

## Next Tasks
- Deploy to free hosting
- User testing with fishing mates
- Performance optimization
