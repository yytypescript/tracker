# YYTS Tracker

Tracks YYTS's activities.

## Usage

### Track Slack Member Count

```bash
DEBUG=slack-members \
SLACK_OAUTH_ACCESS_TOKEN=xoxp-... \
SLACK_MEMBER_COUNT_FILE=slack-members.csv \
SENTRY_DSN=https://... \
yarn run:track-slack-member-count
```

### Track Connpass Member Count

```bash
DEBUG=connpass-members \
CONNPASS_GROUP_URL=https://yyts.connpass.com \
CONNPASS_MEMBER_COUNT_FILE=connpass-member-count.csv \
yarn run:track-connpass-member-count
```

### Upload Slack Member Count Chart Images to AWS S3

```bash
DEBUG=upload-chart \
AWS_ACCESS_KEY_ID=<your IAM access key ID> \
AWS_SECRET_ACCESS_KEY=<your IAM secret access key> \
yarn run:uploadChart \
    --region=ap-northeast-1 \
    --bucket=<bucket name> \
    --key=stats/slack-member-count.png \
    --csv=slack-member-count.csv \
    --title=Slackメンバー数
```

### Run All As A Service

```bash
SLACK_OAUTH_ACCESS_TOKEN=xoxp-... \
CONNPASS_GROUP_URL=https://yyts.connpass.com \
SENTRY_DSN=https://... \
AWS_ACCESS_KEY_ID=... \
AWS_SECRET_ACCESS_KEY=... \
AWS_S3_BUCKET=... \
AWS_S3_REGION=ap-northeast-1 \
docker-compose up -d
```

## AWS Configuration

Create a new S3 bucket.

Create an IAM policy which is labeled `AmazonS3UploadOnlyYYTSChart`.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "s3:PutObject",
            "Resource": "arn:aws:s3:::<your bucket name>/*"
        }
    ]
}
```

Create an IAM user and attach the IAM policy above.

Set up the S3 bucket policy.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "yyts-tracker",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::<your AWS ID 12 digits>:user/<your IAM username>"
            },
            "Action": [
                "s3:PutObject",
                "s3:PutObjectAcl"
            ],
            "Resource": "arn:aws:s3:::<your bucket name>/stats/*"
        }
    ]
}
```

* `s3:PutObject` is for making it possible to upload image.
* `s3:PutObjectAcl` is for making it possible to add public access right to the image uploaded.
