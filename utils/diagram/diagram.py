from diagrams import Diagram, Edge
from diagrams.aws.storage import S3
from diagrams.aws.integration import Eventbridge
from diagrams.aws.compute import Lambda
from diagrams.aws.integration import SQS
from diagrams.aws.network import APIGateway
from diagrams.aws.database import Dynamodb

with Diagram("Seven Seas Stack", show=False):
    s3 = S3("Tiki Bar Bucket")
    eventbridge = Eventbridge("EventBridge Rule")
    village_lambda = Lambda("Village Lambda")
    sqs = SQS("Adventure Queue")
    tower_lambda = Lambda("Tower Lambda")
    api = APIGateway("Seven Seas API")
    dynamodb = Dynamodb("Itty Bitty Table")

    s3 >> Edge(label="Object Created") >> eventbridge
    eventbridge >> Edge(label="Triggers") >> village_lambda
    village_lambda >> Edge(label="Send Message") >> sqs
    sqs >> Edge(label="Triggers") >> tower_lambda
    tower_lambda >> Edge(label="HTTP POST") >> api
    api >> Edge(label="PutItem") >> dynamodb
