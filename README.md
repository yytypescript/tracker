# YYTS Tracker

Tracks YYTS's activities.

## Usage

```bash
DEBUG=slack-members \
SLACK_OAUTH_ACCESS_TOKEN=... \
SLACK_MEMBER_COUNT_FILE=slack-members.csv \
SENTRY_DSN=https://... \
yarn run:track-slack-member-count
```

Via Docker

```bash
SLACK_OAUTH_ACCESS_TOKEN=... \
SENTRY_DSN=https://... \
docker-compose up -d
```
