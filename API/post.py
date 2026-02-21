import json
import boto3
from datetime import datetime

s3 = boto3.client('s3')
BUCKET_NAME = 'scrapesstoragebucket'

def lambda_handler(event, context):
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))

        raw_html = body.get('html')
        if not raw_html:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'ok': False,
                    'message': 'Missing required field: html'
                })
            }

        username = body.get('username', 'unknown')
        platform = body.get('platform', 'unknown')

        safe_username = ''.join(c if c.isalnum() or c in ['-', '_'] else '_' for c in username)
        safe_platform = ''.join(c if c.isalnum() or c in ['-', '_'] else '_' for c in platform)

        # Generate S3 key
        timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
        key = f"raw-html/{safe_platform}/{safe_username}/{timestamp}.html"
        
        # Upload to S3
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=key,
            Body=raw_html.encode('utf-8'),
            ContentType='text/html; charset=utf-8'
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'ok': True,
                'key': key,
                'bucket': BUCKET_NAME,
                'message': "Raw HTML uploaded successfully"
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'ok': False,
                'error': str(e),
                'message': "Failed to upload raw HTML"
            })
        }