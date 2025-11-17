import { randomUUID } from "crypto"

const resendApiKey = process.env.RESEND_API_KEY
const defaultFromEmail = process.env.RESEND_FROM_EMAIL ?? "orders@send.shopblacktshirts.com"
const supportFromEmail =
  process.env.RESEND_SUPPORT_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? defaultFromEmail
const siteDomain = process.env.NEXT_PUBLIC_DOMAIN ?? "https://www.shopblacktshirts.com"

type SendEmailPayload = {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
}

type OrderLineItem = {
  description: string
  quantity: number
  amountTotal: number
  currency: string
}

export type OrderEmailPayload = {
  id: string
  orderNumber: string | null
  customerName: string | null
  customerEmail: string | null
  shippingName: string | null
  shippingAddress?: {
    line1?: string | null
    line2?: string | null
    city?: string | null
    state?: string | null
    postalCode?: string | null
    country?: string | null
  } | null
  lineItems: OrderLineItem[]
  amountTotal: number
  shippingTotal: number
  taxTotal: number
  currency: string
  createdAt?: string | null
  shippedAt?: string | null
  trackingUrl?: string | null
  trackingNumber?: string | null
}

export type SupportTicketEmailPayload = {
  id: string
  subject: string
  customerName: string | null
  customerEmail: string
  orderNumber: string | null
}

export type SupportMessagePayload = {
  id: string
  body: string
  authorType: "customer" | "admin"
  authorName?: string | null
  createdAt?: string | null
}

const currencyFormatter = (currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  })

async function dispatchResendEmail(payload: SendEmailPayload) {
  if (!resendApiKey) {
    console.warn("[email] RESEND_API_KEY missing, skipping outbound email for", payload.subject)
    return { ok: false, skipped: true as const }
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: payload.from ?? defaultFromEmail,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      reply_to: payload.replyTo ?? undefined,
    }),
  })

  if (!response.ok) {
    const error = await response.text().catch(() => "Unknown error")
    console.error("[email] Resend failed", { status: response.status, error })
    return { ok: false as const, skipped: false as const, error }
  }

  return { ok: true as const }
}

function renderEmailLayout({
  title,
  previewText,
  body,
  footer,
}: {
  title: string
  previewText?: string
  body: string
  footer?: string
}) {
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${title}</title>
    ${
      previewText
        ? `<style> .preview-text { display: none; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; } </style>`
        : ""
    }
  </head>
  <body style="background-color:#050505;margin:0;padding:24px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#f7f7f7;">
    ${previewText ? `<span class="preview-text">${previewText}</span>` : ""}
    <table role="presentation" width="100%" style="max-width:640px;margin:0 auto;background:#0f0f0f;border-radius:18px;padding:32px;">
      <tr>
        <td style="text-align:center;padding-bottom:16px;">
          <span style="display:inline-flex;align-items:center;justify-content:center;padding:12px 18px;border-radius:16px;background:#ffffff;">
            <img src="${siteDomain}/shopblacktshirts-logo.png" alt="ShopBlackTShirts" style="height:40px;width:auto;display:block;" />
          </span>
        </td>
      </tr>
      <tr>
        <td style="font-size:26px;font-weight:600;text-align:center;padding-bottom:12px;">${title}</td>
      </tr>
      <tr>
        <td style="font-size:15px;line-height:1.6;color:#d1d1d1;">
          ${body}
        </td>
      </tr>
      ${
        footer
          ? `<tr><td style="padding-top:24px;font-size:12px;color:#7a7a7a;text-align:center;">${footer}</td></tr>`
          : ""
      }
    </table>
  </body>
</html>`
}

export async function sendOrderConfirmationEmail(order: OrderEmailPayload) {
  if (!order.customerEmail) {
    return { ok: false as const, reason: "missing_email" as const }
  }

  const formatter = currencyFormatter(order.currency ?? "USD")
  const lineItemsHtml = order.lineItems
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0;font-weight:600;">${item.description}</td>
          <td style="padding:8px 0;text-align:center;">×${item.quantity}</td>
          <td style="padding:8px 0;text-align:right;">${formatter.format((item.amountTotal ?? 0) / 100)}</td>
        </tr>
      `,
    )
    .join("")

  const totalsHtml = `
    <tr>
      <td style="padding-top:12px;font-weight:600;">Subtotal</td>
      <td></td>
      <td style="padding-top:12px;text-align:right;">${formatter.format(
        (order.amountTotal - order.shippingTotal - order.taxTotal) / 100,
      )}</td>
    </tr>
    <tr>
      <td>Shipping</td>
      <td></td>
      <td style="text-align:right;">${formatter.format(order.shippingTotal / 100)}</td>
    </tr>
    <tr>
      <td>Tax</td>
      <td></td>
      <td style="text-align:right;">${formatter.format(order.taxTotal / 100)}</td>
    </tr>
    <tr>
      <td style="padding-top:12px;font-size:18px;">Total</td>
      <td></td>
      <td style="padding-top:12px;text-align:right;font-size:18px;font-weight:700;">${formatter.format(order.amountTotal / 100)}</td>
    </tr>
  `

  const shippingAddress = order.shippingAddress
    ? [
        order.shippingAddress.line1,
        order.shippingAddress.line2,
        [order.shippingAddress.city, order.shippingAddress.state]
          .filter(Boolean)
          .join(", "),
        order.shippingAddress.postalCode,
        order.shippingAddress.country,
      ]
        .filter(Boolean)
        .join("<br />")
    : "We'll notify you once your order ships."

  const html = renderEmailLayout({
    title: "Order confirmed",
    previewText: "We received your order — thanks for supporting ShopBlackTShirts.",
    body: `
      <p>Hi ${order.customerName ?? "there"},</p>
      <p>Thanks for purchasing from ShopBlackTShirts. We have your order ${
        order.orderNumber ? `<strong>#${order.orderNumber}</strong>` : ""
      } on deck and will notify you again when it ships.</p>
      <table role="presentation" width="100%" style="border-collapse:collapse;margin-top:16px;">
        ${lineItemsHtml}
        ${totalsHtml}
      </table>
      <p style="margin-top:20px;">
        <strong>Shipping to</strong><br />
        ${order.shippingName ?? order.customerName ?? "You"}<br />
        ${shippingAddress}
      </p>
      <p style="margin-top:16px;">Need help? Reply to this email or visit <a href="${siteDomain}/contact" style="color:#f5a623;">our help center</a>.</p>
    `,
    footer: "© " + new Date().getFullYear() + " ShopBlackTShirts — Luxury Meets Street",
  })

  return dispatchResendEmail({
    to: order.customerEmail,
    subject: `We received your order${order.orderNumber ? ` #${order.orderNumber}` : ""}`,
    html,
  })
}

export async function sendShipmentConfirmationEmail(order: OrderEmailPayload) {
  if (!order.customerEmail) {
    return { ok: false as const, reason: "missing_email" as const }
  }

  const formatter = currencyFormatter(order.currency ?? "USD")
  const html = renderEmailLayout({
    title: "Your order is on the way",
    previewText: "We handed your package to the carrier.",
    body: `
      <p>Hi ${order.customerName ?? "there"},</p>
      <p>Your order ${order.orderNumber ? `<strong>#${order.orderNumber}</strong>` : ""} has shipped.</p>
      ${
        order.shippedAt
          ? `<p>Shipped on <strong>${new Date(order.shippedAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "numeric",
            })}</strong></p>`
          : ""
      }
      ${
        order.trackingUrl
          ? `<p><a href="${order.trackingUrl}" style="color:#f5a623;">Track your package</a></p>`
          : ""
      }
      ${
        order.trackingNumber
          ? `<p>Tracking #: <strong>${order.trackingNumber}</strong></p>`
          : ""
      }
      <p style="margin-top:16px;">Total paid: ${formatter.format(order.amountTotal / 100)}</p>
      <p>Thanks for being part of the ShopBlackTShirts community.</p>
    `,
    footer: "Questions? Reply to this email anytime.",
  })

  return dispatchResendEmail({
    to: order.customerEmail,
    subject: `Your order${order.orderNumber ? ` #${order.orderNumber}` : ""} is on the way`,
    html,
  })
}

export async function sendSupportTicketReceivedEmail(
  ticket: SupportTicketEmailPayload,
  firstMessage: SupportMessagePayload,
) {
  const html = renderEmailLayout({
    title: "We received your message",
    previewText: "Our team will respond shortly.",
    body: `
      <p>Hi ${ticket.customerName ?? "there"},</p>
      <p>Thanks for contacting ShopBlackTShirts support. Your ticket ID is <strong>${
        ticket.id
      }</strong>${
        ticket.orderNumber ? ` for order <strong>${ticket.orderNumber}</strong>` : ""
      }. We'll reply within 1-2 business days.</p>
      <p><strong>You wrote:</strong></p>
      <blockquote style="border-left:2px solid #f5a623;padding-left:12px;color:#c5c5c5;">
        ${firstMessage.body.replace(/\n/g, "<br />")}
      </blockquote>
      <p>Need to add more info? Reply to this email and it will be attached to your ticket.</p>
    `,
    footer: "ShopBlackTShirts Support",
  })

  return dispatchResendEmail({
    to: ticket.customerEmail,
    subject: `We received your support request (${ticket.id})`,
    html,
    from: supportFromEmail,
    replyTo: supportFromEmail,
  })
}

export async function sendSupportReplyEmail(
  ticket: SupportTicketEmailPayload,
  reply: SupportMessagePayload,
) {
  const html = renderEmailLayout({
    title: "Update from ShopBlackTShirts support",
    previewText: "We've replied to your message.",
    body: `
      <p>Hi ${ticket.customerName ?? "there"},</p>
      <p>We just replied to your ticket${ticket.orderNumber ? ` for order ${ticket.orderNumber}` : ""}.</p>
      <p><strong>Our response:</strong></p>
      <blockquote style="border-left:2px solid #f5a623;padding-left:12px;color:#c5c5c5;">
        ${reply.body.replace(/\n/g, "<br />")}
      </blockquote>
      <p>Reply to this email if you have follow-up questions. We're here to help.</p>
    `,
    footer: "ShopBlackTShirts Support — " + supportFromEmail,
  })

  return dispatchResendEmail({
    to: ticket.customerEmail,
    subject: `Support update for ticket ${ticket.id}`,
    html,
    from: supportFromEmail,
    replyTo: supportFromEmail,
  })
}

export function buildOrderEmailPayload(
  orderId: string,
  data: {
    orderNumber?: string | null
    customerName?: string | null
    customerEmail?: string | null
    shipping?: {
      name?: string | null
      address?: {
        line1?: string | null
        line2?: string | null
        city?: string | null
        state?: string | null
        postalCode?: string | null
        country?: string | null
      } | null
    } | null
    lineItems?: Array<{
      description?: string | null
      quantity?: number | null
      amountTotal?: number | null
      currency?: string | null
    }>
    amountTotal?: number | null
    shippingTotal?: number | null
    taxTotal?: number | null
    currency?: string | null
    createdAt?: string | null
    shippedAt?: string | null
    trackingUrl?: string | null
    trackingNumber?: string | null
  },
): OrderEmailPayload {
  return {
    id: orderId,
    orderNumber: data.orderNumber ?? null,
    customerName: data.customerName ?? null,
    customerEmail: data.customerEmail ?? null,
    shippingName: data.shipping?.name ?? null,
    shippingAddress: data.shipping?.address ?? null,
    lineItems: (data.lineItems ?? []).map((item) => ({
      description: item.description ?? "Item",
      quantity: item.quantity ?? 1,
      amountTotal: item.amountTotal ?? 0,
      currency: item.currency ?? data.currency ?? "usd",
    })),
    amountTotal: data.amountTotal ?? 0,
    shippingTotal: data.shippingTotal ?? 0,
    taxTotal: data.taxTotal ?? 0,
    currency: data.currency ?? "usd",
    createdAt: data.createdAt ?? null,
    shippedAt: data.shippedAt ?? null,
    trackingUrl: data.trackingUrl ?? null,
    trackingNumber: data.trackingNumber ?? null,
  }
}

export function buildSupportTicketPayload(ticket: {
  id: string
  subject?: string | null
  customerName?: string | null
  customerEmail: string
  orderNumber?: string | null
}): SupportTicketEmailPayload {
  return {
    id: ticket.id,
    subject: ticket.subject ?? "Support request",
    customerName: ticket.customerName ?? null,
    customerEmail: ticket.customerEmail,
    orderNumber: ticket.orderNumber ?? null,
  }
}

export function buildMessagePayload(message: {
  id?: string
  body: string
  authorType: "customer" | "admin"
  authorName?: string | null
  createdAt?: string | null
}): SupportMessagePayload {
  return {
    id: message.id ?? randomUUID(),
    body: message.body,
    authorType: message.authorType,
    authorName: message.authorName ?? null,
    createdAt: message.createdAt ?? new Date().toISOString(),
  }
}
