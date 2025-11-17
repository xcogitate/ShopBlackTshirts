"use server"

import { randomUUID } from "crypto"
import { FieldValue } from "firebase-admin/firestore"

import { adminDb } from "@/lib/server/firebase-admin"
import {
  buildMessagePayload,
  buildSupportTicketPayload,
  sendSupportReplyEmail,
  sendSupportTicketReceivedEmail,
  type SupportMessagePayload,
} from "@/lib/server/email"

type FirestoreTimestamp =
  | Date
  | {
      toDate?: () => Date
    }
  | null
  | undefined

export type SupportTicketStatus = "open" | "waiting_customer" | "waiting_admin" | "closed"

export type SupportMessage = {
  id: string
  authorType: "customer" | "admin"
  authorName?: string | null
  authorEmail?: string | null
  body: string
  createdAt: string
}

export type SupportTicketRecord = {
  id: string
  subject: string | null
  topic: string | null
  orderNumber: string | null
  customerName: string | null
  customerEmail: string
  status: SupportTicketStatus
  messages: SupportMessage[]
  createdAt: string | null
  updatedAt: string | null
}

const toISOString = (value: FirestoreTimestamp) => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "string") return value
  if (typeof value === "object" && typeof value?.toDate === "function") {
    return value.toDate().toISOString()
  }
  return null
}

function deserializeTicket(
  doc: FirebaseFirestore.DocumentSnapshot,
): SupportTicketRecord | null {
  const data = doc.data()
  if (!data) return null

  const messagesArray: SupportMessage[] = Array.isArray(data.messages)
    ? data.messages.map((message) => ({
        id: typeof message.id === "string" ? message.id : randomUUID(),
        authorType: message.authorType === "admin" ? "admin" : "customer",
        authorName: message.authorName ?? null,
        authorEmail: message.authorEmail ?? null,
        body: message.body ?? "",
        createdAt:
          typeof message.createdAt === "string"
            ? message.createdAt
            : toISOString(message.createdAt) ?? new Date().toISOString(),
      }))
    : []

  return {
    id: doc.id,
    subject: typeof data.subject === "string" ? data.subject : null,
    topic: typeof data.topic === "string" ? data.topic : null,
    orderNumber: typeof data.orderNumber === "string" ? data.orderNumber : null,
    customerName: typeof data.customerName === "string" ? data.customerName : null,
    customerEmail: typeof data.customerEmail === "string" ? data.customerEmail : "",
    status: (data.status as SupportTicketStatus) ?? "open",
    messages: messagesArray,
    createdAt: toISOString(data.createdAt),
    updatedAt: toISOString(data.updatedAt),
  }
}

export async function createSupportTicket(input: {
  name: string
  email: string
  subject?: string
  topic?: string
  orderNumber?: string | null
  message: string
}) {
  const ticketRef = adminDb.collection("supportTickets").doc()
  const firstMessageId = randomUUID()
  const now = new Date().toISOString()

  const payload = {
    subject: input.subject ?? `Support request - ${input.topic ?? "General"}`,
    topic: input.topic ?? "general",
    orderNumber: input.orderNumber ?? null,
    customerName: input.name ?? null,
    customerEmail: input.email.toLowerCase(),
    status: "open" as SupportTicketStatus,
    messages: [
      {
        id: firstMessageId,
        authorType: "customer" as const,
        authorName: input.name ?? null,
        authorEmail: input.email,
        body: input.message,
        createdAt: now,
      },
    ],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    lastMessageAt: FieldValue.serverTimestamp(),
    lastMessageBy: "customer",
  }

  await ticketRef.set(payload)

  const ticketData: SupportTicketRecord = {
    id: ticketRef.id,
    subject: payload.subject,
    topic: payload.topic,
    orderNumber: payload.orderNumber,
    customerName: payload.customerName,
    customerEmail: payload.customerEmail,
    status: payload.status,
    messages: payload.messages,
    createdAt: now,
    updatedAt: now,
  }

  await sendSupportTicketReceivedEmail(
    buildSupportTicketPayload(ticketData),
    buildMessagePayload(payload.messages[0]),
  )

  return ticketData
}

export async function listSupportTickets(options?: {
  limit?: number
  status?: SupportTicketStatus
}) {
  let query: FirebaseFirestore.Query = adminDb
    .collection("supportTickets")
    .orderBy("updatedAt", "desc")

  if (options?.status) {
    query = query.where("status", "==", options.status)
  }

  const limit =
    typeof options?.limit === "number" && Number.isFinite(options.limit)
      ? Math.min(Math.max(Math.floor(options.limit), 1), 200)
      : 50
  query = query.limit(limit)

  const snapshot = await query.get()
  return snapshot.docs
    .map((doc) => deserializeTicket(doc))
    .filter((ticket): ticket is SupportTicketRecord => Boolean(ticket))
}

export async function getSupportTicket(ticketId: string) {
  const ref = adminDb.doc(`supportTickets/${ticketId}`)
  const snapshot = await ref.get()
  if (!snapshot.exists) {
    return null
  }
  return deserializeTicket(snapshot)
}

export async function addAdminReplyToTicket(input: {
  ticketId: string
  body: string
  admin: { uid?: string | null; email?: string | null; name?: string | null }
  status?: SupportTicketStatus
}) {
  const ticketRef = adminDb.doc(`supportTickets/${input.ticketId}`)
  const snapshot = await ticketRef.get()
  if (!snapshot.exists) {
    throw new Error("Ticket not found.")
  }

  const message: SupportMessage = {
    id: randomUUID(),
    authorType: "admin",
    authorName: input.admin.name ?? "ShopBlackTShirts Support",
    authorEmail: input.admin.email ?? null,
    body: input.body,
    createdAt: new Date().toISOString(),
  }

  await ticketRef.update({
    messages: FieldValue.arrayUnion(message),
    status: input.status ?? ("waiting_customer" as SupportTicketStatus),
    updatedAt: FieldValue.serverTimestamp(),
    lastMessageAt: FieldValue.serverTimestamp(),
    lastMessageBy: "admin",
  })

  const updated = await ticketRef.get()
  const normalized = deserializeTicket(updated)
  if (normalized) {
    await sendSupportReplyEmail(
      buildSupportTicketPayload(normalized),
      buildMessagePayload(message),
    )
  }

  return normalized
}

export async function updateSupportTicketStatus(ticketId: string, status: SupportTicketStatus) {
  const ticketRef = adminDb.doc(`supportTickets/${ticketId}`)
  await ticketRef.update({
    status,
    updatedAt: FieldValue.serverTimestamp(),
  })
  const snapshot = await ticketRef.get()
  return deserializeTicket(snapshot)
}
