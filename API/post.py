import json
import boto3
from datetime import datetime

s3 = boto3.client('s3')
BUCKET_NAME = 'scrapesstoragebucket'

def lambda_handler(event, context):
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        # Generate S3 key
        timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
        key = f"scrapes/{timestamp}.json"
        
        # Upload to S3
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=key,
            Body=json.dumps(body, indent=2),
            ContentType='application/json'
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
                'bucket': BUCKET_NAME
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
                'error': str(e)
            })
        }