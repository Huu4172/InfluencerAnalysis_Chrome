import json
import boto3
from datetime import datetime

s3 = boto3.client('s3')
dynamodb = boto3.client('dynamodb')
BUCKET_NAME = 'scrapesstoragebucket'
TABLE_NAME = 'TikTokUsers'

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
        
        # Write to DynamoDB
        dynamodb.put_item(
            TableName=TABLE_NAME,
            Item = {
                'username' : {'S': body.get('username', 'unknown')},
                'name': {'S': body.get('username', 'unknown')},
                'followcount' : {'S': body.get('followers', 'unknown')},
                'categories': {'L': []}, 
                'lastUpdate': {'S': datetime.now().isoformat()}
            })

        
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
                'message': "Data uploaded and recorded successfully"
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
                'message': "Failed to upload and record data"
            })
        }