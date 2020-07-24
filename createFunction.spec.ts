import { Topic } from '@google-cloud/pubsub'
import { EmailData } from '@suin/email-data'
import { EventData } from '@suin/event-data'
import { PubSubFunction } from '@suin/google-cloud-typed-pubsub-function'
import { createFunction, Dependencies, Logger } from './createFunction'

describe('createFunction', () => {
  // @ts-ignore
  const mutedLogger: Logger = {
    info: () => {},
    error: () => {},
  }
  let publishedEvents: any[] = []
  const pubsubStub: Dependencies['pubsub'] = {
    topic: () => ({
      publish: async (data: Buffer) => {
        publishedEvents.push(JSON.parse(data.toString()))
        return ''
      },
    }),
    getTopics: async () => [
      [
        { name: encodeURIComponent('1@example.com') },
        { name: encodeURIComponent('2@example.com') },
        { name: encodeURIComponent('3@example.com') },
      ] as Topic[],
    ],
  }
  const routeEmail = createFunction({ pubsub: pubsubStub, logger: mutedLogger })
  const dummyContext = {
    timestamp: '',
    eventId: '',
    eventType: '',
  }

  beforeEach(() => {
    publishedEvents = []
  })

  it('publishes event', async () => {
    const event: EventData<EmailData> = {
      correlationId: 'dummy',
      data: {
        to: [{ name: '', address: '1@example.com' }],
        cc: [
          { name: '', address: '2@example.com' },
          { name: '', address: 'no@example.com' },
        ],
        replyTo: [],
        subject: '',
        from: [],
      },
    }
    await routeEmail(createValidEvent(event), dummyContext)
    expect(publishedEvents).toEqual([event, event])
  })
})

const createValidEvent = (
  data: EventData<EmailData>,
): Parameters<PubSubFunction>[0] => {
  return {
    data: Buffer.from(JSON.stringify(data)).toString('base64'),
    attributes: null,
  }
}
