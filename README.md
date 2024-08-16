# Adventures of JSON

This is a [AWS CDK](https://aws.amazon.com/cdk/) repository that contains the entire infrastructure for the `Adventures of JSON` Twitch series.

As of **2024-08-15** this is the rough flow of `JSON`:
![Mermaid chart](/img/mermaidflow.png)

## Starting the adventure

In order to have `JSON` make it's way to your AWS infrastructure, you first need to deploy some infrastructure. To do that, let's deploy some CDK.

Run the following commands from the root of this directory:
```bash
npm install
npm run build
```

Then run `cdk deploy`, and respond to the questions you get.

Finally, to kickoff `JSON` you need to upload him to the **S3 Bucket**. I have created a handy `Makefile` to do that (you need to have `aws cli`) installed:
```bash
make up
```

## Resetting the adventure

To reset the adventure, and try again. Just run the following `make` command:
```bash
make reset
```

## ⚠️ NOTE

As S3 buckets have unique names, make sure to change the name of your bucket before deploying the cdk stack. The best way to do that is change the following TypeScript code in `lib/seven_seas-stack.ts`:
```javascript
// S3 Bucket
const tikiBarBucket = new s3.Bucket(this, 'tikiBeachBucket', {
  bucketName: "the-spicy-platypus-tiki-bar",
  eventBridgeEnabled: true, enforceSSL: true,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
  versioned: true,
});
```

Replace the `bucketName` with a unique name to you.

