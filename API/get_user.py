import json
import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('TikTokUsers')

def lambda_handler(event, context):
    try:
        # Parse query parameters
        params = event.get('queryStringParameters', {}) or {}
        username = params.get('username', None)
        
        if not username:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'ok': False,
                    'error': 'username parameter is required'
                })
            }
        
        # Query using GSI on username
        response = table.query(
            IndexName='UsernameIndex',  
            KeyConditionExpression=Key('username').eq(username)
        )
        
        items = response.get('Items', [])
        
        if not items:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'ok': False,
                    'error': f'User @{username} not found in database'
                })
            }
        
        # Return the user data (should be only one item)
        user_data = items[0]
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'ok': True,
                'data': user_data
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
