import json
import requests
import os
import logging 

# Logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# constants
API_GATEWAY_URL_ENV = 'API_GATEWAY_URL'

def process_message(message):
    try:
        message_json = json.loads(message)
        api_gateway_url = os.environ['API_GATEWAY_URL']
        response = requests.post(api_gateway_url, json=message_json)
        response.raise_for_status()

        logger.info(f"Message processed successfully: {response.status_code}")
        return True
    except requests.RequestException as e:
        logger.error(f"Error sending request to API gateway: {str(e)}")
        return False
    except json.JSONDecodeError:
        logger.error("Invalid JSON in SQS message")
        return False
    except KeyError:
        logger.error(f"Missing environment variable: {API_GATEWAY_URL_ENV}")
        return False


def lambda_handler(event, context):
    try:
        if 'Records' not in event:
            raise ValueError("No Records found in event")
        results = []
        for record in event['Records']:
            message = record['body']
            result = process_message(message)
            results.append(result)

        if all(results):
            return {
                'statusCode': 200,
                'body': json.dumps('Message processed successfully')
            }
        else:
            return {
                'statusCode': 500,
                'body': json.dumps('Error processing messages')
            }
    except Exception as e: 
        logger.error(f"Unexpected error has occured: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps('Oh no! Internal server error')
        }
