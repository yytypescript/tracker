import axios from 'axios'
import * as cheerio from 'cheerio'
import { format } from 'date-fns'
import { getEnvOrDie } from './env'
import { saveMemberCount } from './saveMemberCount'
import { enableSentryIfPossible } from './sentry'

const debug = require('debug')('connpass-members')

// language=JQuery-CSS
const CONNPASS_MEMBER_ELEMENT_SELECTOR = '#side_area .title .amount'

const getMemberCount = async (connpassGroupUrl: string): Promise<number> => {
  debug(`GET ${connpassGroupUrl}`)
  const response = await axios.get(connpassGroupUrl)
  debug(`Response: status=${response.status}`)

  const $ = cheerio.load(response.data)
  const amountEl = $(CONNPASS_MEMBER_ELEMENT_SELECTOR)
  if (amountEl.length === 0) {
    throw new Error(
      'Failed to find the HTML element that contains member count',
    )
  }
  const memberCountTxt = amountEl.text()
  const memberCount = parseInt(memberCountTxt, 10)
  if (isNaN(memberCount)) {
    throw new Error(
      `Failed to parse the member count: ${JSON.stringify(memberCountTxt)}`,
    )
  }
  return memberCount
}

const main = async () => {
  const connpassGroupUrl = getEnvOrDie('CONNPASS_GROUP_URL')
  const file = getEnvOrDie('CONNPASS_MEMBER_COUNT_FILE')
  enableSentryIfPossible()
  const memberCount = await getMemberCount(connpassGroupUrl)
  const today = format(new Date(), 'yyyy-MM-dd')
  debug(`today=${today} memberCount=${memberCount}`)
  await saveMemberCount(file, today, memberCount)
  debug(`written data to ${file}`)
}

main().then()
