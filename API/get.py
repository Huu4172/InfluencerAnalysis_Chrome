import json
import boto3
from datetime import datetime

s3 = boto3.client('s3')
dynamodb = boto3.client('dynamodb')
TABLE_NAME = 'TikTokUsers'

def parse_follower_count(count_str):
    """
    Parse follower count string to numeric value.
    Handles: '1.2M', '500K', '1.5B', '1234', etc.
    """
    if not count_str:
        return 0
    
    count_str = str(count_str).strip().upper().replace(',', '')
    
    multipliers = {
        'K': 1000,
        'M': 1000000,
        'B': 1000000000
    }
    
    multiplier = 1
    for suffix, mult in multipliers.items():
        if count_str.endswith(suffix):
            multiplier = mult
            count_str = count_str[:-1]
            break
    
    try:
        return int(float(count_str) * multiplier)
    except ValueError:
        return 0


def lambda_handler(event, context):
    try:
        # Parse query parameters
        params = event.get('queryStringParameters', {}) or {}
        
        try:
            # Get follower tier (required)
            follower_tier = params.get('tier', None)
            if not follower_tier:
                raise ValueError("tier parameter is required (micro, small, medium, large, mega)")
            
            # Validate tier value
            valid_tiers = ['micro', 'small', 'medium', 'large', 'mega']
            if follower_tier not in valid_tiers:
                raise ValueError(f"Invalid tier. Must be one of: {', '.join(valid_tiers)}")
            
            # Get categories (optional, comma-separated)
            categories_param = params.get('categories', None)
            categories = [cat.strip() for cat in categories_param.split(',') if cat.strip()] if categories_param else None
            
        except ValueError as e:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'ok': False,
                    'error': str(e)
                })
            }
        
        # Build FilterExpression dynamically
        filter_expression = 'followerTier = :tier'
        expression_values = {':tier': {'S': follower_tier}}
        
        # Add category filters if provided
        if categories:
            # Build OR conditions for multiple categories
            category_conditions = []
            for i, category in enumerate(categories):
                category_conditions.append(f'contains(categories, :cat{i})')
                expression_values[f':cat{i}'] = {'S': category}
            
            # Combine with tier filter using AND
            filter_expression += ' AND (' + ' OR '.join(category_conditions) + ')'
        
        # Scan with FilterExpression
        response = dynamodb.scan(
            TableName=TABLE_NAME,
            FilterExpression=filter_expression,
            ExpressionAttributeValues=expression_values
        )
        items = response.get('Items', [])
        
        # Handle pagination - keep scanning until we get all items
        while 'LastEvaluatedKey' in response:
            response = dynamodb.scan(
                TableName=TABLE_NAME,
                FilterExpression=filter_expression,
                ExpressionAttributeValues=expression_values,
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            items.extend(response.get('Items', []))
        
        # Transform results to clean JSON
        results = []
        for item in items:
            followcount_str = item.get('followcount', {}).get('S', '0')
            categories_list = item.get('categories', {}).get('L', [])
            category_strings = [cat.get('S', '') for cat in categories_list]
            
            results.append({
                'username': item.get('username', {}).get('S', ''),
                'name': item.get('name', {}).get('S', ''),
                'followcount': followcount_str,
                'followerCountNumeric': parse_follower_count(followcount_str),
                'followerTier': item.get('followerTier', {}).get('S', ''),
                'profileImageUrl': item.get('profileImageUrl', {}).get('S', ''),
                'categories': category_strings,
                'lastUpdate': item.get('lastUpdate', {}).get('S', '')
            })
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'ok': True,
                'count': len(results),
                'tier': follower_tier,
                'categories': categories,
                'results': results
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
