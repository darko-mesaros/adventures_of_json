import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as eventbridge from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as pylambda from '@aws-cdk/aws-lambda-python-alpha';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export class SevenSeasStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // imports - hello
    const queue = new sqs.Queue(this, 'AdventureQueue');

    // S3 Bucket
    const tikiBarBucket = new s3.Bucket(this, 'tikiBeachBucket', {
      bucketName: "the-spicy-platypus-tiki-bar",
      eventBridgeEnabled: true, enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: true,
    });
    // EventBridge
    const jsonEntersBucket = new eventbridge.Rule(this, 'JsonEntersBucket', {
      eventPattern: {
        source: ['aws.s3'],
        detailType: ['Object Created'],
        detail: {
          bucket: { name: [tikiBarBucket.bucketName]},
          object: { key: [{ prefix: 'lobby/hero.json' }] },
        },
      },
    });

    // Village of Lambda
    const villageLambda = new pylambda.PythonFunction(this, 'VillageFunction', {
      entry: 'lambda/village',
      runtime: lambda.Runtime.PYTHON_3_12,
      index: 'village.py',
      handler: 'lambda_handler',
      timeout: cdk.Duration.seconds(30),
      environment: {
        QUEUE_URL: queue.queueUrl,
      },
    });

    // event bridge destination
    jsonEntersBucket.addTarget(new targets.LambdaFunction(villageLambda));
    // village lambda permissions
    tikiBarBucket.grantRead(villageLambda);
    queue.grantSendMessages(villageLambda);


    // DynamoDB API Gateway Bridge
    const table = new dynamodb.Table(this, 'IttyBittyTable', {
      partitionKey: { name: 'name', type: dynamodb.AttributeType.STRING },
      tableName: 'ittybitty',
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const api = new apigateway.RestApi(this, 'SevenSeasApi');

    const hubertResource = api.root.addResource('hubert');
    const hubertMethod = hubertResource.addMethod('POST', new apigateway.Integration({
      type: apigateway.IntegrationType.AWS,
      integrationHttpMethod: 'POST',
      //uri: 'arn:aws:apigateway:us-west-2:dynamodb:action/PutItem',
      uri: `arn:aws:apigateway:${this.region}:dynamodb:action/PutItem`,
      options: {
        passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_MATCH,
        credentialsRole: new iam.Role(this, 'ApiGatewayDynamoDbRole', {
          assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
          roleName: 'ApiGatewayDynamoDbRole',
          inlinePolicies: {
            'DynamoDBPutItemPolicy': new iam.PolicyDocument({
              statements: [
                new iam.PolicyStatement({
                  effect: iam.Effect.ALLOW,
                  actions: ['dynamodb:PutItem'],
                  resources: [table.tableArn],
                }),
              ],
            }),
          },
        }),
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': `
                #set($inputRoot = $input.path('$'))
                {
                  "message": "Item added successfully"
                }`,
            },
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': "'*'"
            }
          },
          {
            selectionPattern: '4\\d{2}',
            statusCode: '400',
            responseTemplates: {
              'application/json': JSON.stringify({
                message: 'Error: $input.path(\'$.errorMessage\')'
              })
            },
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': "'*'"
            }
          }
        ],
        // TODO: This should be a bit more flexible
        requestTemplates: {
          'application/json': `{
            "TableName": "${table.tableName}",
            "Item": {
              "name": { "S": "$input.path('$.name')" },
              "creation_date": { "S": "$input.path('$.creation_date')" },
              "level": { "N": "$input.path('$.level')" },
              "abilities": {
                "M": {
                  "security": { "N": "$input.path('$.abilities.security')" },
                  "elasticity": { "N": "$input.path('$.abilities.elasticity')" },
                  "durability": { "N": "$input.path('$.abilities.durability')" },
                  "versioning": { "BOOL": "$input.path('$.abilities.versioning')" },
                  "filtered": { "BOOL": "$input.path('$.abilities.filtered')" }
                }
              },
              "inventory": { "L": [{ "S": "$input.path('$.inventory[0]')" }] },
              "services_visited": { "L": [
                { "S": "$input.path('$.services_visited[0]')" },
                { "S": "$input.path('$.services_visited[1]')" }
              ]},
              "events": {
                "L": [
                  { "M": {
                    "multiPartUploadFailed": { "S": "$input.path('$.events[0].multiPartUploadFailed')" }
                  }},
                  { "M": {
                    "sam_9010SolvedTheProblem": { "S": "$input.path('$.events[1].sam_9010SolvedTheProblem')" }
                  }}
                ]
              }
            }
          }`
        },
      }}));

    hubertMethod.addMethodResponse({
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Origin': true,
      },
      responseModels: {
        'application/json': apigateway.Model.EMPTY_MODEL,
      }
    });
    hubertMethod.addMethodResponse({
      statusCode: '400',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Origin': true,
      },
      responseModels: {
        'application/json': apigateway.Model.ERROR_MODEL,
      }
    });

    // Tower Lambda
    const towerLambda = new pylambda.PythonFunction(this, 'TowerFunction', {
      entry: 'lambda/tower',
      runtime: lambda.Runtime.PYTHON_3_12,
      index: 'tower.py',
      timeout: cdk.Duration.seconds(30),
      handler: 'lambda_handler',
      environment: {
        API_GATEWAY_URL: api.urlForPath(hubertResource.path)
      }
    });
    // Add the event source mapping
    towerLambda.addEventSource(new lambdaEventSources.SqsEventSource(queue, {
      batchSize: 10, 
      maxBatchingWindow: cdk.Duration.seconds(60), 
    }));

    queue.addToResourcePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [new iam.ServicePrincipal('lambda.amazonaws.com')],
      actions: ['sqs:ReceiveMessage', 'sqs:DeleteMessage', 'sqs:GetQueueAttributes'],
      resources: [queue.queueArn],
    }));

    // output
    let hubertOutput = new cdk.CfnOutput(this, "apigatewayhubert", {
      exportName: "apigwhubert",
      value: api.urlForPath(hubertResource.path)
    });
  }
}
