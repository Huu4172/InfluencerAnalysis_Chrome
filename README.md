# Social Media Influencer Analysis Chrome Extension

A Chrome extension for scraping and analyzing TikTok and Instagram influencer profiles. Automatically extracts follower counts, posts, hashtags, and stores data in AWS DynamoDB with S3 integration.

## Features

### 🎯 Profile Scraping
- **TikTok & Instagram Support**: Scrape profile data from both platforms
- **Auto-detection**: Validates and detects the correct social media platform
- **Smart Extraction**: Captures followers, display name, profile image, and recent posts
- **Tag Extraction**: Automatically extracts hashtags from post captions (up to 15 tags per post)


### 🔍 Search & Discovery
- **Search by Follower Tier**: Filter influencers by follower count (micro, small, medium, large, mega)
- **Category Filtering**: Search by categories/tags (e.g., fitness, health, sports)
- **Real-time Results**: Query DynamoDB for instant search results

### 💾 Data Management
- **Download User Data**: Export complete database records as JSON files
- **Download Raw HTML**: Save the full HTML content of scraped pages
- **Partial Scrape Support**: Download HTML even when scraping fails for debugging

### ☁️ AWS Integration
- **DynamoDB**: Stores user profiles with follower tiers and categories
- **S3**: Archives detailed scrape data with timestamps
- **API Gateway + Lambda**: RESTful API for data upload and queries
- **GSI Support**: Fast username-based queries using Global Secondary Index

