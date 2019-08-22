import axios from 'axios'
import { format } from 'date-fns'
import { getEnvOrDie } from './env'
import { saveMemberCount } from './saveMemberCount'
import { enableSentryIfPossible } from './sentry'

const debug = require('debug')('slack-members')

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

const main = async () => {
  const oauthAccessToken = getEnvOrDie('SLACK_OAUTH_ACCESS_TOKEN')
  const file = getEnvOrDie('SLACK_MEMBER_COUNT_FILE')
  enableSentryIfPossible()
  const memberCount = await getMemberCount(oauthAccessToken)
  const today = format(new Date(), 'yyyy-MM-dd')
  debug(`today=${today} memberCount=${memberCount}`)
  await saveMemberCount(file, today, memberCount)
  debug(`written data to ${file}`)
}

main().then()
