import { postToSlack } from './postToSlack.ts'
import { getReport } from './getAnalyticsReport.ts'
import type { Period } from './getAnalyticsReport.ts'

const main = async () => {
    try {
        const reportType = (Deno.args[0] as Period) || 'weekly'
        const report = await getReport(reportType)
        const res = await postToSlack(report)
        console.log(res)
    } catch (e) {
        console.error(e)
        postToSlack(JSON.stringify(e))
    }
}
main()
