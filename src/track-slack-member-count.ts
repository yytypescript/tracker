import { Event, EventHint } from '@sentry/types'
import axios from 'axios'
import { format } from 'date-fns'

const fs = require('fs')
const debug = require('debug')('slack-members')
const sentry = require('@sentry/node')

interface GetMemberResponse {
  readonly members: ReadonlyArray<Member>
  readonly response_metadata: {
    readonly next_cursor: string
  }
}

interface Member {
  readonly name: string
}

const getMembers = async (param: {
  token: string
  cursor?: string | null
}): Promise<GetMemberResponse> => {
  const url = 'https://slack.com/api/users.list'
  debug(`GET ${url}?cursor=${param.cursor}`)
  const response = await axios.get(url, {
    params: {
      ...param,
      limit: 100,
    },
  })
  debug(`Response: status=${response.status}`)
  const isValidData = (data: unknown): data is GetMemberResponse => {
    const isPartial = (data2: unknown): data2 is Partial<GetMemberResponse> =>
      data2 !== null && typeof data2 === 'object'
    return (
      isPartial(data) &&
      Array.isArray(data.members) &&
      data.response_metadata !== null &&
      typeof data.response_metadata === 'object'
    )
  }
  if (!isValidData(response.data)) {
    debug(`Invalid data: data=${JSON.stringify(response.data)}`)
    throw new Error(`Invalid response: ${JSON.stringify(response.data)}`)
  }
  return response.data
}

const getMemberCount = async (oauthAccessToken: string): Promise<number> => {
  let memberCount = 0
  let nextCursor: string | null = null
  let data: GetMemberResponse

  while (nextCursor || nextCursor === null) {
    debug(`getMembers(${nextCursor})`)
    data = await getMembers({ token: oauthAccessToken, cursor: nextCursor })
    debug(`getMembers(${nextCursor}) => ${data.members.length}`)
    memberCount += data.members.length
    nextCursor = data.response_metadata.next_cursor
  }

  return memberCount
}

const saveMemberCount = async (
  file: string,
  date: string,
  count: number,
): Promise<void> =>
  await fs.promises.appendFile(file, [date, count].join(',') + '\n')

const main = async () => {
  const oauthAccessToken = process.env.SLACK_OAUTH_ACCESS_TOKEN
  if (!oauthAccessToken) {
    throw new Error('Environment variable SLACK_OAUTH_ACCESS_TOKEN is missing')
  }
  const file = process.env.SLACK_MEMBER_COUNT_FILE
  if (!file) {
    throw new Error('Environment variable SLACK_MEMBER_COUNT_FILE is missing')
  }
  const sentryDsn = process.env.SENTRY_DSN
  if (sentryDsn) {
    sentry.init({
      dsn: sentryDsn,
      beforeSend(event: Event, hint?: EventHint) {
        if (hint && hint.originalException) {
          console.error(hint.originalException)
        }
        return event
      },
    })
  }

  const memberCount = await getMemberCount(oauthAccessToken)
  const today = format(new Date(), 'yyyy-MM-dd')
  debug(`today=${today} memberCount=${memberCount}`)
  await saveMemberCount(file, today, memberCount)
}

main().then()
