import Command, { flags } from '@oclif/command'
import AWS from 'aws-sdk'
import S3 from 'aws-sdk/clients/s3'
import axios from 'axios'
import { format, parse } from 'date-fns'
import csv from 'fast-csv'
import fs from 'fs'
import * as tempy from 'tempy'
import { enableSentryIfPossible } from './sentry'
const debug = require('debug')('upload-chart')

class Data {
  private readonly _dates: Date[] = []
  private readonly _memberCounts: number[] = []

  get dates(): ReadonlyArray<Date> {
    return this._dates
  }

  get memberCounts(): ReadonlyArray<number> {
    return this._memberCounts
  }

  add(date: Date, memberCount: number): void {
    this._dates.push(date)
    this._memberCounts.push(memberCount)
  }
}

const readCsv = (file: string): Promise<Data> =>
  new Promise((resolve, reject) => {
    debug(`Reading CSV file: ${file}`)
    const data = new Data()
    const parser = csv
      .parse({ headers: ['date', 'members'] })
      .on('error', reject)
      .on('data', row => {
        debug(`Reading CSV row: ${JSON.stringify(row)}`)
        data.add(
          parse(row.date, 'yyyy-MM-dd', new Date()),
          parseInt(row.members, 10),
        )
      })
      .on('end', () => {
        debug(`Finished reading CSV file: ${file}`)
        resolve(data)
      })
    fs.createReadStream(file).pipe(parser)
  })

const makeChart = async (
  data: Data,
  chartTitle: string,
  chartFilename: string,
): Promise<void> =>
  new Promise(async (resolve, reject) => {
    debug('Making a chart')
    const url = 'https://quickchart.io/chart'
    const chart = {
      type: 'line',
      data: {
        labels: data.dates.map(date => format(date, 'M/d')),
        datasets: [
          {
            label: 'Dogs',
            data: data.memberCounts,
            borderColor: '#007acc',
            backgroundColor: 'rgba(0,122,204,0.71)',
            pointRadius: 0,
            lineTension: 0.1,
            borderWidth: 2,
          },
        ],
      },
      options: {
        title: {
          display: true,
          text: chartTitle,
          fontColor: '#007acc',
          fontSize: 16,
          fontStyle: 'normal',
        },
        legend: {
          display: false,
        },
        scales: {
          yAxes: [
            {
              gridLines: {
                display: false,
                drawBorder: false,
              },
              ticks: {
                min: 0,
                maxTicksLimit: 5,
              },
            },
          ],
          xAxes: [
            {
              gridLines: {
                display: false,
                drawBorder: false,
              },
              ticks: {
                maxRotation: 0,
                minRotation: 0,
                autoSkip: true,
                maxTicksLimit: 6,
              },
            },
          ],
        },
      },
    }
    debug('Downloading the chart')
    const res = await axios.get(url, {
      responseType: 'stream',
      params: { bkg: 'white', c: JSON.stringify(chart) },
    })
    const writer = fs.createWriteStream(chartFilename)
    res.data.pipe(writer)
    writer.on('finish', () => {
      debug(`Finished downloading the chart to ${chartFilename}`)
      resolve()
    })
    writer.on('error', reject)
  })

type UploadS3Param = Readonly<{
  accessKeyId: string
  secretAccessKey: string
  region: string
  bucket: string
  key: string
  contentType: string
  body: Buffer
}>

const uploadS3 = ({
  accessKeyId,
  secretAccessKey,
  region,
  bucket,
  key,
  body,
  contentType,
}: UploadS3Param): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    debug(
      `Uploading the chart to S3. region: ${region}, bucket: ${bucket}, key: ${key}`,
    )
    const s3 = new S3({ accessKeyId, secretAccessKey, region })
    const param: S3.Types.PutObjectRequest = {
      ACL: 'public-read',
      Body: body,
      Bucket: bucket,
      ContentType: contentType,
      Key: key,
    }
    s3.upload(param, (err: Error, data: S3.ManagedUpload.SendData) => {
      if (err) {
        reject(err)
      } else {
        debug(`Finished uploading the chart to S3. url: ${data.Location}`)
        resolve()
      }
    })
  })

class Main extends Command {
  static flags = {
    accessKeyId: flags.string({ env: 'AWS_ACCESS_KEY_ID', required: true }),
    secretAccessKey: flags.string({
      env: 'AWS_SECRET_ACCESS_KEY',
      required: true,
    }),
    region: flags.string({ env: 'AWS_S3_REGION', required: true }),
    bucket: flags.string({ env: 'AWS_S3_BUCKET', required: true }),
    key: flags.string({ required: true }),
    csv: flags.string({ required: true }),
    title: flags.string({ required: true }),
    debug: flags.boolean(),
  }

  async run(): Promise<void> {
    enableSentryIfPossible()
    // tslint:disable-next-line:no-shadowed-variable
    const { flags } = this.parse(Main)
    const { accessKeyId, secretAccessKey, region, bucket, key } = flags
    if (flags.debug) {
      AWS.config.logger = console
    }
    const data = await readCsv(flags.csv)
    const tempFile = tempy.file({ name: 'chart.png' })
    debug(`Temporary file: ${tempFile}`)
    await makeChart(data, flags.title, tempFile)
    await uploadS3({
      accessKeyId,
      secretAccessKey,
      region,
      bucket,
      key,
      body: fs.readFileSync(tempFile),
      contentType: 'image/png',
    })
  }
}

Main.run()
