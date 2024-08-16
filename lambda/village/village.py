import json
import boto3
import os
from datetime import date
import logging

# Logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    try:
        bucket_name = event['detail']['bucket']['name']
        key_name = event['detail']['object']['key']
        # download the file from the s3 bucket
        s3 = boto3.client('s3')
        s3.download_file(bucket_name, key_name, '/tmp/hero.json')
        
        # modify the contents of the downloaded json file
        with open('/tmp/hero.json') as f:
            data = json.load(f)
            # append data to the json array
            data['services_visited'].append("lambda")
            data['services_visited'].append("sqs")
            today = date.today().isoformat()
            data['events'].append({"s3WritingRecursion": today})

        # send the JSON to SQS
        sqs = boto3.client('sqs')
        queue_url = os.environ['QUEUE_URL']
        response = sqs.send_message(
            QueueUrl=queue_url,
            MessageBody=json.dumps(data)
        )

        logger.info(f"Message sent to SQS queue: {response['MessageId']}")

        # return the entire json event this aws lambda function receives
        return {
            'statusCode': 200,
            'body': json.dumps(event)
        }
    except KeyError as e:
        logger.error(f"Missing key in event: {str(e)}")
        return {'statusCode': 400, 'body': json.dumps({'error':'Invalid event structure'})}
    except Exception as e:
        logger.error(f"Error processing event: {str(e)}")
        return {'statusCode': 400, 'body': json.dumps({'error':'Oh no! Internal server error'})}
