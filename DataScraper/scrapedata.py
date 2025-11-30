"""
TikTok Playwright scraper - extract follower count and up to 3 recent post tags from public profiles.
No login required.
"""
import sys
import json
import re
import importlib


def scrape_tiktok_profile(profile_url: str, headless: bool = True, wait_timeout_ms: int = 8000):
    """
    Use Playwright to scrape a public TikTok profile.
    Returns follower count and up to 3 recent posts with tags.
    
    Args:
        profile_url: TikTok profile URL (e.g., https://www.tiktok.com/@username)
        headless: Run browser in headless mode
        wait_timeout_ms: Timeout in milliseconds
    
    Returns:
        dict: {
            "followers": str,
            "posts": [{"postUrl": str, "tags": [str], "captionPreview": str}],
            "url": str,
            "ok": bool
        }
    
    Requirements:
        pip install playwright
        playwright install chromium
    """
    try:
        playwright_sync = importlib.import_module("playwright.sync_api")
        sync_playwright = getattr(playwright_sync, "sync_playwright")
    except Exception:
        raise ImportError(
            "playwright is not installed. Run `pip install playwright` and `playwright install chromium`."
        )

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-software-rasterizer",
                "--disable-dev-tools",
                "--no-zygote",
                "--single-process",
                "--disable-setuid-sandbox",
            ],
            slow_mo=50 if not headless else 0,
        )

        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
            locale="en-US",
            timezone_id="America/New_York",
        )
        page = context.new_page()

        try:
            print(f"[Playwright] Navigating to {profile_url}")
            page.goto(profile_url, wait_until="domcontentloaded", timeout=wait_timeout_ms)
            page.wait_for_timeout(1000)

            # Dismiss any cookie/consent banners (quick attempt)
            dismiss_selectors = [
                'button:has-text("Accept")',
                'button:has-text("Got it")',
            ]
            for sel in dismiss_selectors:
                try:
                    page.click(sel, timeout=1000)
                    break  # Stop after first successful dismiss
                except Exception:
                    pass

            page.wait_for_timeout(500)

            # Extract follower count from DOM
            followers = None
            try:
                follower_elem = page.locator('strong[data-e2e="followers-count"]').first
                if follower_elem.is_visible(timeout=3000):
                    followers = follower_elem.inner_text().strip()
                    print(f"[Playwright] Found followers via DOM: {followers}")
            except Exception as e:
                print(f"[Playwright] Could not find follower count via DOM: {e}")

            # Extract posts from DOM grid
            posts = []
            try:
                post_list = page.locator('div[data-e2e="user-post-item-list"]').first
                if post_list.is_visible(timeout=3000):
                    post_items = post_list.locator('div[id^="grid-item-container-"]').all()
                    print(f"[Playwright] Found {len(post_items)} post items in DOM grid")
                    
                    for idx, item in enumerate(post_items[:3]):
                        try:
                            # Get image alt text (contains caption/tags)
                            img = item.locator('img[alt]').first
                            alt = img.get_attribute('alt') if img.is_visible() else ''
                            
                            # Extract hashtags from alt text (max 15 tags/post)
                            tags = [tag.strip('#') for tag in re.findall(r'#(\w+)', alt)][:15]
                            
                            # Get post URL from anchor tag
                            post_url = None
                            a = item.locator('a[href]').first
                            if a.is_visible():
                                href = a.get_attribute('href')
                                if href and href.startswith('/'):
                                    post_url = f"https://www.tiktok.com{href}"
                                elif href:
                                    post_url = href
                            
                            posts.append({
                                "postUrl": post_url,
                                "tags": tags,
                                "captionPreview": alt[:150].replace("\n", " ").strip()
                            })
                            print(f"[Playwright] Post {idx+1}: {len(tags)} tags - {tags[:5]}")
                        except Exception as post_err:
                            print(f"[Playwright] Error extracting post {idx+1}: {post_err}")
                else:
                    print("[Playwright] Post grid not visible")
            except Exception as e:
                print(f"[Playwright] Error finding post grid: {e}")

            return {
                "followers": followers,
                "posts": posts,
                "url": page.url,
                "ok": followers is not None
            }

        except Exception as e:
            print(f"[Playwright] Error: {e}")
            raise
        finally:
            browser.close()
            
def scrape(event, context):
    """AWS Lambda worker handler for async scraping jobs.
    
    Invoked asynchronously with event: {"jobId": "...", "url": "..."}
    Updates DynamoDB with results when complete.
    """
    import os
    import time
    
    try:
        # Import boto3 only when needed (for Lambda environment)
        import boto3
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(os.environ['JOBS_TABLE'])
    except Exception as e:
        print(f"[Worker] Failed to connect to DynamoDB: {e}")
        return {"ok": False, "error": str(e)}
    
    job_id = event.get('jobId')
    url = event.get('url')
    
    if not job_id or not url:
        print(f"[Worker] Missing jobId or url in event: {event}")
        return {"ok": False, "error": "Missing jobId or url"}
    
    print(f"[Worker] Processing job {job_id} for URL: {url}")
    
    # Update status to processing
    try:
        table.update_item(
            Key={'jobId': job_id},
            UpdateExpression='SET #status = :status, updatedAt = :updated',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'processing',
                ':updated': int(time.time())
            }
        )
    except Exception as e:
        print(f"[Worker] Failed to update status to processing: {e}")
    
    try:
        # Run the scraper
        result = scrape_tiktok_profile(url, headless=True)
        
        # Update DynamoDB with results
        table.update_item(
            Key={'jobId': job_id},
            UpdateExpression='SET #status = :status, followers = :followers, posts = :posts, completedAt = :completed',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'completed',
                ':followers': result.get('followers'),
                ':posts': result.get('posts', []),
                ':completed': int(time.time())
            }
        )
        
        print(f"[Worker] Job {job_id} completed successfully")
        return {"ok": True, "jobId": job_id}
        
    except Exception as e:
        # Update DynamoDB with error
        err_msg = str(e)
        print(f"[Worker] Job {job_id} failed: {err_msg}")
        import traceback
        traceback.print_exc()
        
        try:
            table.update_item(
                Key={'jobId': job_id},
                UpdateExpression='SET #status = :status, error = :error, completedAt = :completed',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':status': 'failed',
                    ':error': err_msg,
                    ':completed': int(time.time())
                }
            )
        except Exception as update_err:
            print(f"[Worker] Failed to update error status: {update_err}")
        
        return {"ok": False, "error": err_msg}


if __name__ == "__main__":
    """
    Usage:
        python scrapedata.py <tiktok_profile_url> [--headful]
    
    Examples:
        python scrapedata.py https://www.tiktok.com/@darkstudios.ai
        python scrapedata.py https://www.tiktok.com/@darkstudios.ai --headful
    """
    if len(sys.argv) < 2:
        print("Usage: python scrapedata.py <tiktok_profile_url> [--headful]")
        print("Example: python scrapedata.py https://www.tiktok.com/@username")
        sys.exit(1)
    
    url = sys.argv[1]
    headful = "--headful" in sys.argv
    
    print(f"[CLI] Scraping TikTok profile: {url}")
    print(f"[CLI] Headful mode: {headful}")
    
    result = scrape_tiktok_profile(url, headless=(not headful))
    
    # Save results
    output_file = "/tmp/tiktok_scrape_result.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"\n[CLI] Results saved to {output_file}")
    print(f"[CLI] Followers: {result['followers']}")
    print(f"[CLI] Posts extracted: {len(result['posts'])}")
    
    if result['posts']:
        print("\n[CLI] Post summaries:")
        for idx, post in enumerate(result['posts'], 1):
            print(f"  {idx}. {post['postUrl']}")
            print(f"     Tags: {', '.join(post['tags'][:10])}")
            print(f"     Caption: {post['captionPreview'][:80]}...")
