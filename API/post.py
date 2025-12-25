import json
import boto3
from datetime import datetime

s3 = boto3.client('s3')
dynamodb = boto3.client('dynamodb')
BUCKET_NAME = 'scrapesstoragebucket'
TABLE_NAME = 'TikTokUsers'

def get_follower_tier(follower_count):
    if follower_count < 1000:
        return 'micro'
    elif 1000 <= follower_count < 10000:
        return 'small'
    elif 10000 <= follower_count < 100000:
        return 'medium'
    elif 100000 <= follower_count < 1000000:
        return 'large'
    else:
        return 'mega'
    
def parse_follower_count(count_str):
    if not count_str:
        return 0
    
    count_str = str(count_str).strip().upper()
    
    count_str = count_str.replace(',', '')
    
    multiplier_dict = {
        'K': 1000,
        'M': 1000000,
        'B': 1000000000
    }
    
    multiplier =  1
    
    for suffix, mult in multiplier_dict.items():
        if count_str.endswith(suffix):
            multiplier = mult
            count_str = count_str[:-1]
            break
        
    try:
        base_count = float(count_str)
        return int(base_count * multiplier)
    except ValueError:
        return 0
    

def lambda_handler(event, context):
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        follower_count_str = body.get('followers', '0')
        follower_count_int = parse_follower_count(follower_count_str)
        
        body['followerTier'] = get_follower_tier(follower_count_int)
        
        
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
                'followerTier' : {'S': get_follower_tier(follower_count_int)},
                'username' : {'S': body.get('username', 'unknown')},
                'name': {'S': body.get('name', body.get('username', 'unknown'))},
                'followcount' : {'S': follower_count_str},
                'profileImageUrl': {'S': body.get('profileImageUrl', '')},
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