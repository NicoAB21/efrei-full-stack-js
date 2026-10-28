export type Message = {
  id: string
  listingId: string
  senderId: string
  recipientId: string
  body: string
  createdAt: string
}

export type ReceivedMessage = Message & { listingTitle: string | null }

export type Conversation = {
  listingId: string
  listingTitle: string | null
  messages: ReceivedMessage[]
}

export function groupByListing(messages: ReceivedMessage[]): Conversation[] {
  const groups = new Map<string, Conversation>()
  for (const message of messages) {
    const group = groups.get(message.listingId)
    if (group) group.messages.push(message)
    else groups.set(message.listingId, { listingId: message.listingId, listingTitle: message.listingTitle, messages: [message] })
  }
  return [...groups.values()]
}
