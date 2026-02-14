# Data Collection Flow

This document describes how data flows through the system from initial scraping to storage and AI categorization.

## Overview

The system follows a two-stage data processing pipeline:
1. **Stage 1**: Real-time scraping from TikTok/Instagram profiles (Using the extension)
2. **Stage 2**: Automated AI categorization using Kiro-CLI (configurable intervals)

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    STAGE 1: REAL-TIME SCRAPING                  │
└─────────────────────────────────────────────────────────────────┘

  Chrome Extension
       │
       ├─ User clicks "Analyze Current Page"
       │
       ▼
  ┌─────────────────────────────┐
  │  TikTok/Instagram Profile   │
  │  Page (DOM Scraping)        │
  └──────────┬──────────────────┘
             │
             │ Extract:
             │ • Username, Display Name
             │ • Follower Count
             │ • Profile Image
             │ • Recent Posts (URL, Caption, Tags)
             │ • View Counts (TikTok)
             │
             ▼
  ┌─────────────────────────────┐
  │  background.js              │
  │  (Service Worker)           │
  └──────────┬──────────────────┘
             │
             │ Package Data:
             │ {
             │   username: "user",
             │   followers: "164.4K",
             │   tags: ["fitness", "health"],
             │   posts: [{
             │     postUrl: "...",
             │     tags: [...],
             │     captionPreview: "...",
             │     viewCount: "1.2M"
             │   }],
             │   profileImageUrl: "...",
             │   platform: "tiktok"
             │ }
             │
             ▼
  ┌─────────────────────────────┐
  │  AWS Lambda Function        │
  │  (uploadScraperData)        │
  └──────────┬──────────────────┘
             │
             │ ├─► Process & Validate Data
             │ ├─► Calculate Follower Tier
             │ │   (micro/small/medium/large/mega)
             │ └─► Store S3 Key Reference
             │
             ├──────────────────┬──────────────────┐
             │                  │                  │
             ▼                  ▼                  ▼
  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐
  │  DynamoDB        │  │  S3 Bucket       │  │  User UI     │
  │  (TikTokUsers)   │  │  (JSON Files)    │  │  (Success    │
  │                  │  │                  │  │   Message)   │
  │ • username       │  │ • Full data      │  └──────────────┘
  │ • followers      │  │ • Timestamps     │
  │ • followerTier   │  │ • Raw posts      │
  │ • categories     │  │ • View counts    │
  │ • posts          │  │                  │
  │ • platform       │  │ Location:        │
  │                  │  │ scrapes/         │
  │ GSI:             │  │ YYYYMMDD-       │
  │ UsernameIndex    │  │ HHMMSS.json      │
  └──────────┬───────┘  └──────────────────┘
             │
             └─────────────────────────────────────►(Ready for AI processing)


┌─────────────────────────────────────────────────────────────────┐
│                STAGE 2: AI CATEGORIZATION (ASYNC)               │
│                   (Triggered via Kiro-CLI)                      │
└─────────────────────────────────────────────────────────────────┘

  Kiro-CLI Command
       │
       ├─ Specify Time Interval
       │  • Every hour
       │  • Every 6 hours
       │  • Every day
       │  • Custom interval
       │
       ▼
  ┌─────────────────────────────┐
  │  AI Processing Service      │
  │  (Scheduled Job)            │
  └──────────┬──────────────────┘
             │
             │ For each entry in DynamoDB:
             │
             ├─► Fetch JSON from S3
             │   (using s3Key reference)
             │
             ▼
  ┌─────────────────────────────┐
  │  JSON File Analysis         │
  │  (AI Categorization)        │
  │                             │
  │ Analyze:                    │
  │ • Post captions             │
  │ • Post tags (#hashtags)     │
  │ • Content themes            │
  │ • Audience engagement       │
  │ • Video view counts         │
  └──────────┬──────────────────┘
             │
             │ Generate Categories:
             │ ["fitness", "health",
             │  "motivation", "nutrition"]
             │
             ▼
  ┌─────────────────────────────┐
  │  Update DynamoDB Entry      │
  │  (With AI Categories)       │
  │                             │
  │ Update fields:              │
  │ • categories (AI-generated) │
  │ • lastUpdate (timestamp)    │
  │ • confidence scores         │
  └─────────────────────────────┘
             │
             ▼
  ┌─────────────────────────────┐
  │  Data Ready for Queries     │
  │                             │
  │ Now searchable by:          │
  │ • Follower Tier             │
  │ • AI Categories             │
  │ • Platform                  │
  └─────────────────────────────┘
```

## Data Storage Structure

### DynamoDB (TikTokUsers Table)

```json
{
  "username": "influencer_name",           // Primary Key (Sort Key)
  "followerTier": "medium",                // Partition Key (micro/small/medium/large/mega)
  "name": "Display Name",
  "followcount": "164.4K",
  "followerCountNumeric": 164400,          // Numeric value for sorting/comparison
  "platform": "tiktok",
  "profileImageUrl": "https://...",
  "categories": ["fitness", "health"],     // AI-categorized tags
  "lastUpdate": "2026-02-15T10:30:00",
  "s3Key": "scrapes/20260215-103000.json", // Reference to full data in S3
  "posts": [
    {
      "postUrl": "https://www.tiktok.com/...",
      "tags": ["fitness", "workout"],
      "captionPreview": "Daily motivation...",
      "viewCount": "1.2M"
    }
  ]
}
```

### S3 (scrapesstoragebucket)

File location: `scrapes/YYYYMMDD-HHMMSS.json`

```json
{
  "username": "influencer_name",
  "name": "Display Name",
  "followers": "164.4K",
  "followerTier": "medium",
  "platform": "tiktok",
  "profileImageUrl": "https://...",
  "tags": ["fitness", "health", "motivation"],
  "posts": [
    {
      "postUrl": "https://www.tiktok.com/...",
      "tags": ["fitness", "workout", "gym"],
      "captionPreview": "Morning gym session...",
      "viewCount": "1.2M"
    },
    {
      "postUrl": "https://www.tiktok.com/...",
      "tags": ["nutrition", "diet"],
      "captionPreview": "Healthy meal prep...",
      "viewCount": "890K"
    }
  ]
}
```

## Data Flow Stages

### Stage 1: Real-Time Scraping (User-Initiated)

| Step | Component | Action |
|------|-----------|--------|
| 1 | Chrome Extension | User clicks "Analyze Current Page" on TikTok/Instagram profile |
| 2 | DOM Parser | Extracts profile data and recent posts from page |
| 3 | background.js | Packages data into uploadData object |
| 4 | API Gateway | Sends POST request to Lambda function |
| 5 | Lambda (post.py) | Validates, processes, and calculates follower tier |
| 6 | DynamoDB | Stores user profile with initial tags |
| 7 | S3 | Archives complete JSON data with timestamp |
| 8 | UI | Displays success message with username and follower count |

**Latency**: ~2-5 seconds

---

### Stage 2: AI Categorization (Automated)

| Step | Component | Action |
|------|-----------|--------|
| 1 | Kiro-CLI | User specifies automation interval via command |
| 2 | AI Service | Reads each user's S3 JSON file |
| 3 | Analyzer | Processes posts, captions, and tags |
| 4 | Categorizer | Generates AI-based categories with confidence scores |
| 5 | DynamoDB | Updates user entry with new categories |
| 6 | Notification | (Optional) Notifies user of categorization update |

**Execution**: Background process, doesn't block user interface

---


## Data Availability

### Immediately After Scraping (Stage 1)
-  Username, follower count, profile image
-  Post URLs and captions
-  View counts (TikTok)
-  Initial tags from captions
-  Follower tier classification
-  AI-categorized categories (pending)

### After AI Processing (Stage 2)
-  All Stage 1 data
-  **AI-generated categories**
-  Category confidence scores
-  Searchable by category tier

## Query Examples

### By Follower Tier + Category (After Stage 2)
```bash
GET /query?tier=medium&categories=fitness
```
Returns all medium-tier influencers categorized as fitness.

### By Username (Any Time)
```bash
GET /user?username=influencer_name
```
Returns complete profile data from DynamoDB.

## Performance Considerations

- **Stage 1 Latency**: Sub-second network calls, minimal impact
- **Stage 2 Processing**: 
  - Small batch (< 100 users): ~5 minutes
  - Medium batch (100-1K users): ~15-30 minutes
  - Large batch (1K+ users): 1-2 hours
  - Can run during off-peak hours

## Data Retention

- **DynamoDB**: Indefinite (updated regularly)
- **S3**: Indefinite (versioned by timestamp)
- **Recommended Cleanup**: Archive data older than 1 year to S3 Glacier

