import { config } from 'https://deno.land/x/dotenv/mod.ts'
const __filename = import.meta.url

const {
    SLACK_BOT_TOKEN,
    SLACK_TARGET_CHANNEL,
    SLACK_BOT_USERNAME,
    SLACK_BOT_EMOJI,
} = config()
const url = 'https://slack.com/api/chat.postMessage'

const postToSlack = async (
    message: string,
    channel: string = SLACK_TARGET_CHANNEL
) => {
    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
    }
    const body = {
        channel: channel,
        text: message,
        username: SLACK_BOT_USERNAME,
        icon_emoji: SLACK_BOT_EMOJI,
    }
    const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: headers,
    })
    const json = await res.json()

    // success post
    if (json.ok) return json

    // failed post
    throw {
        fileName: __filename,
        errorMessage: json,
    }
}

export { postToSlack }
