# Carplog-Pro - Product Requirements Document

## Overview
Carplog-Pro is a personal carp fishing diary application that allows anglers to log their catches, track statistics, and manage their fishing profile.

## Tech Stack
- **Frontend**: React.js with Tailwind CSS
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

### 5. Profile
- Personal info (name, age, years angling, bio)
- Gear setup (rods, reels, alarms, bobbins, bivvy, etc.)
- Line setup (mainline, hooklink, breaking strains)
- Preferences (favorite brands, baits, rigs)
- Fishing locations (home waters, favorite venues)

## What's Been Implemented

### January 31, 2026
1. **Weight Display Format**: Changed from decimal lb (e.g., "25.5 lb") to lb and oz format (e.g., "25 lb 8 oz")
2. **Separate lb/oz Input**: Add Catch form now shows two separate fields for lb and oz when imperial unit selected
3. **Remember Me Checkbox**: Login form saves credentials to localStorage when checked, auto-fills on next visit
4. **Year Restriction**: Year selector now shows 2026 onwards only (no historical years)
5. **Date Range**: Date picker allows selecting any date in 2026 (removed restriction to past dates only)

## User Personas
- **Recreational Carp Anglers**: Want to track their catches and see progress over time
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
- User testing and feedback collection
- Performance optimization for large catch databases
- Mobile responsiveness improvements
