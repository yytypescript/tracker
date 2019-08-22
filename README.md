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

### Run All As A Service

```bash
SLACK_OAUTH_ACCESS_TOKEN=xoxp-... \
CONNPASS_GROUP_URL=https://yyts.connpass.com \
SENTRY_DSN=https://... \
docker-compose up -d
```
