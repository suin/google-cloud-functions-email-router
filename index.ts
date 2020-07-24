import { PubSub } from '@google-cloud/pubsub'
import { PubSubFunction } from '@suin/google-cloud-typed-pubsub-function'
import { createFunction } from './createFunction'

export const routeEmail: PubSubFunction = createFunction({
  pubsub: new PubSub(),
})
