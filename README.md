# @suin/google-cloud-functions-email-router

## Setting Up

### Deploying The Stacks To Your GCP

```bash
./deploy.sh
```

## Test Drive

```bash
# Setting up
gcloud pubsub topics create 'test%40example.com'
gcloud pubsub subscriptions create --topic 'test%40example.com' testDrive

# Test
gcloud pubsub topics publish allEmail --message '{"correlationId":"dummy","data":{"to":[{"name":"","address":"test@example.com"}],"cc":[],"replyTo":[],"subject":"Test","from":[]}}'
gcloud pubsub subscriptions pull testDrive \
    --format="flattened(ackId,message.messageId,message.publishTime,message.attributes,message.data.decode(base64).encode(utf-8))" \
    --limit=10 \
    --auto-ack

# Cleaning up
gcloud pubsub subscriptions delete testDrive
gcloud pubsub topics delete 'test%40example.com'
```
