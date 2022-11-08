import { config } from 'https://deno.land/x/dotenv/mod.ts'
import {
    GoogleAuth,
    AnalyticsReporting,
    ReportRow,
} from 'https://googleapis.deno.dev/v1/analyticsreporting:v4.ts'
const __filename = import.meta.url

export type Period = 'daily' | 'weekly' | 'monthly'
type ReportType = 'newSummary' | 'previousSummary' | 'ranking'
type Options = {
    startDate: string
    endDate: string
    size: number
}

const initAnalyticsReporting = () => {
    const key = {
        type: 'service_account',
        project_id: config().GCP_PROJECT_ID,
        private_key_id: config().GCP_PRIVATE_KEY_ID,
        private_key: config().GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: config().GCP_CLIENT_EMAIL,
        client_id: '',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url:
            'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: config().GCP_CLIENT_X509_CERT_URL,
    }

    const auth = new GoogleAuth().fromJSON(key)
    return new AnalyticsReporting(auth)
}

const getSummary = async (client: AnalyticsReporting, options: Options) => {
    const res = await client.reportsBatchGet({
        reportRequests: [
            {
                viewId: config().GOOGLE_ANALYTICS_VIEW_ID,
                dateRanges: [
                    {
                        startDate: options.startDate,
                        endDate: options.endDate,
                    },
                ],
                metrics: [
                    { expression: 'ga:sessions' },
                    { expression: 'ga:pageviews' },
                    { expression: 'ga:pageviewsPerSession' },
                    { expression: 'ga:avgSessionDuration' },
                    { expression: 'ga:bounceRate' },
                ],
            },
        ],
    })

    const reports = res.reports
    const rows = reports ? reports[0]?.data?.rows : undefined
    const metrics = rows ? rows[0]?.metrics : undefined
    const values = metrics ? metrics[0]?.values : undefined

    if (values && values.length > 0) return values

    throw {
        fileName: __filename,
        errorMessage: {
            type: 'Cant get summary',
        },
    }
}

const getRanking = async (client: AnalyticsReporting, options: Options) => {
    const res = await client.reportsBatchGet({
        reportRequests: [
            {
                viewId: config().GOOGLE_ANALYTICS_VIEW_ID,
                dateRanges: [
                    {
                        startDate: options.startDate,
                        endDate: options.endDate,
                    },
                ],
                metrics: [{ expression: 'ga:pageviews' }],
                dimensions: [{ name: 'ga:pagePath' }, { name: 'ga:pageTitle' }],
                orderBys: [
                    { fieldName: 'ga:pageviews', sortOrder: 'DESCENDING' },
                ],
                pageSize: options.size,
            },
        ],
    })

    const reports = res.reports
    const rows = reports ? reports[0]?.data?.rows : undefined

    if (rows && rows.length > 0) return rows

    throw {
        fileName: __filename,
        errorMessage: {
            type: 'Cant get ranking',
        },
    }
}

const getOptions = (period: Period, reportType: ReportType): Options => {
    const formatter = (date: Date) => {
        const formattedDate = new Intl.DateTimeFormat('ja-JP', {
            timeZone: 'Asia/Tokyo',
            dateStyle: 'short',
        }).format(date)
        return formattedDate.replace(/\//g, '-')
    }

    if (period === 'daily') {
        const dateDiff = reportType === 'previousSummary' ? 2 : 1
        const date = new Date()
        const targetDate = new Date(date.setDate(date.getDate() - dateDiff))
        return {
            startDate: formatter(targetDate),
            endDate: formatter(targetDate),
            size: 10,
        }
    }

    if (period === 'weekly') {
        const startDateDiff = reportType === 'previousSummary' ? 14 : 7
        const endDateDiff = reportType === 'previousSummary' ? 8 : 1
        const startDateObj = new Date()
        const startDate = new Date(
            startDateObj.setDate(startDateObj.getDate() - startDateDiff)
        )
        const endDateObj = new Date()
        const endDate = new Date(
            endDateObj.setDate(endDateObj.getDate() - endDateDiff)
        )
        return {
            startDate: formatter(startDate),
            endDate: formatter(endDate),
            size: 10,
        }
    }

    if (period === 'monthly') {
        const startMonthDiff = reportType === 'previousSummary' ? 2 : 1
        const date = new Date()
        const targetMonth = new Date(
            date.setMonth(date.getMonth() - startMonthDiff)
        )
        const year = targetMonth.getFullYear()
        const month = targetMonth.getMonth()
        const startDate = new Date(year, month, 1)
        const endDate = new Date(year, month + 1, 0)
        return {
            startDate: formatter(startDate),
            endDate: formatter(endDate),
            size: 20,
        }
    }

    throw {
        fileName: __filename,
        errorMessage: {
            type: `Invalid payload`,
            payload: { period, reportType },
        },
    }
}

const createSummaryText = (
    newSummary: string[],
    previousSummary: string[],
    period: Period
) => {
    const format = <T>(value: T) => {
        const val = typeof value === 'string' ? Number(value) : value
        return Math.round(Number(val) * 100) / 100
    }
    const getResult = (newVal: string, previousVal: string) => {
        const result = format(format(newVal) - format(previousVal))
        const resultText = result > 0 ? `+${result}` : result
        return `(${resultText}) ${result > 0 ? '↗' : '↘'}`
    }
    const options = getOptions(period, 'newSummary')
    const periodText =
        period === 'daily'
            ? options.startDate
            : `${options.startDate} ~ ${options.endDate}`

    // prettier-ignore
    const res = `${periodText} のレポート
        訪問数 : ${format(newSummary[0])} ${getResult(newSummary[0], previousSummary[0])}
        合計PV : ${format(newSummary[1])} ${getResult(newSummary[1], previousSummary[1])}
        平均閲覧ページ数 : ${format(newSummary[2])} ${getResult(newSummary[2], previousSummary[2])}
        平均滞在時間 : ${format(newSummary[3])}秒 ${getResult(newSummary[3], previousSummary[3])}
        直帰率 : ${format(newSummary[4])}% ${getResult(newSummary[4], previousSummary[4])}
    `
    return res.replace(/^ +/gm, '')
}

const createRankingText = (ranking: ReportRow[], period: Period) => {
    const options = getOptions(period, 'ranking')
    const periodText =
        period === 'daily'
            ? options.startDate
            : `${options.startDate} ~ ${options.endDate}`
    const res = `${periodText} のランキング
        ${ranking
            .map(
                (row, index) =>
                    `${index + 1}. ${row.dimensions && row.dimensions[1]} ${
                        row.metrics &&
                        row.metrics[0].values &&
                        row.metrics[0].values[0]
                    }PV\n`
            )
            .join('')}
    `
    return res
        .replace(/^ +/gm, '')
        .replace(new RegExp(config().RANKING_EXCLUDE_TEXT, 'gm'), '')
}

const getReport = async (period: Period) => {
    const client = initAnalyticsReporting()

    const newSummary = await getSummary(
        client,
        getOptions(period, 'newSummary')
    )
    const previousSummary = await getSummary(
        client,
        getOptions(period, 'previousSummary')
    )
    const summaryText = createSummaryText(newSummary, previousSummary, period)
    const ranking = await getRanking(client, getOptions(period, 'ranking'))
    const rankingText = createRankingText(ranking, period)

    return summaryText + '\n' + rankingText
}

export { getReport }
