import type { GetTopicsResponse, Topic } from '@google-cloud/pubsub'
import { EmailData, parseEmailData } from '@suin/email-data'
import { EventData, parseEventData } from '@suin/event-data'
import type { PubSubFunction } from '@suin/google-cloud-typed-pubsub-function'

export const createFunction = ({
  pubsub,
  logger = defaultLogger,
}: Dependencies): PubSubFunction => async event => {
  let eventData: EventData
  try {
    eventData = parseEventData(
      JSON.parse(Buffer.from(event.data, 'base64').toString('utf-8')),
    )
  } catch (error) {
    logger.error('Failed to parse EventData', { event })
    console.error(error)
    return
  }

  let emailData: EmailData
  try {
    emailData = parseEmailData(eventData.data)
  } catch (error) {
    logger.error('Failed to parse EmailData', { error, eventData })
    console.error(error)
    return
  }

  // Gets all topics in this project
  let topics: Topic[]
  try {
    ;[topics] = await pubsub.getTopics()
  } catch (error) {
    logger.error('Failed to get topics', { error })
    return
  }
  const topicIds = new Set(
    topics.map(topic => decodeURIComponent(topic.name.split('/').pop()!)),
  )
  logger.info(`Fetched all topics: ${topicIds.size} topics`, {
    topics: [...topicIds],
  })

  // Collects recipient list
  const recipients = new Set([
    ...emailData.to.map(to => to.address),
    ...emailData.cc.map(cc => cc.address),
  ])
  logger.info('Collected recipient list', { recipients: [...recipients] })

  // Decides target topics from `to` and `cc` attributes of the email data
  const targetTopics = intersectionOf(recipients, topicIds)
  logger.info(`Decided target topics: ${targetTopics.size} topics`, {
    targetTopics: [...targetTopics],
  })

  // Routes the event to each target topics
  for (const topicId of targetTopics) {
    try {
      await pubsub
        .topic(encodeURIComponent(topicId))
        .publish(Buffer.from(JSON.stringify(eventData), 'utf8'))
      logger.info(`Routed event ${eventData.correlationId} to ${topicId}`, {
        targetTopic: topicId,
        event: eventData,
      })
    } catch (e) {
      logger.error(
        `Failed to route event ${eventData.correlationId} to ${topicId}`,
        {
          targetTopic: topicId,
          event: eventData,
          error: e,
        },
      )
    }
  }
}

const defaultLogger: Logger = {
  error(message: string, meta?: unknown): void {
    console.error(JSON.stringify({ message, meta }))
  },
  info(message: string, meta?: unknown): void {
    console.info(JSON.stringify({ message, meta }))
  },
}

const intersectionOf = <A>(a: Set<A>, b: Set<A>): Set<A> =>
  new Set([...a].filter(x => b.has(x)))

export type Dependencies = {
  readonly pubsub: {
    getTopics(): Promise<GetTopicsResponse>
    topic(name: string): Pick<Topic, 'publish'>
  }
  readonly logger?: Logger
}

export type Logger = Pick<Console, 'info' | 'error'>
