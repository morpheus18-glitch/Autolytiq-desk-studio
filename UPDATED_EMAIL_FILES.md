# Updated Email System Files

## 1. Schema Update (shared/schema.ts)

Add this field to the emailMessages table (around line 1614):

```typescript
// Add after isDraft field
direction: text("direction").notNull().default("outbound"), // inbound, outbound
```

## 2. Complete Updated Draft API Route (server/email-routes.ts)

```typescript
/**
 * POST /api/email/drafts
 * Save or update draft email with autosave support
 */
router.post("/drafts", async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    // @ts-ignore
    const dealershipId = req.user?.dealershipId || "default";

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const data = saveDraftSchema.parse(req.body);

    // Check if we're updating an existing draft
    if (data.draftId) {
      // Update existing draft
      const message = await saveDraft({
        dealershipId,
        userId,
        draftId: data.draftId,
        to: data.to,
        cc: data.cc,
        bcc: data.bcc,
        subject: data.subject,
        htmlBody: data.htmlBody,
        textBody: data.textBody,
        customerId: data.customerId,
        dealId: data.dealId,
        attachments: data.attachments,
      });

      console.log(`[EmailRoutes] Updated draft ${data.draftId}`);

      return res.status(200).json({
        success: true,
        data: message,
        message: "Draft updated successfully",
      });
    }

    // Create new draft
    const message = await saveDraft({
      dealershipId,
      userId,
      to: data.to,
      cc: data.cc,
      bcc: data.bcc,
      subject: data.subject,
      htmlBody: data.htmlBody,
      textBody: data.textBody,
      customerId: data.customerId,
      dealId: data.dealId,
      attachments: data.attachments,
    });

    console.log(`[EmailRoutes] Created new draft ${message.id}`);

    res.status(201).json({
      success: true,
      data: message,
      message: "Draft saved successfully",
    });
  } catch (error) {
    console.error("[EmailRoutes] Error saving draft:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        errors: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to save draft",
    });
  }
});

/**
 * PUT /api/email/drafts/:id
 * Update existing draft (explicit update endpoint)
 */
router.put("/drafts/:id", async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    // @ts-ignore
    const dealershipId = req.user?.dealershipId || "default";

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    // Validate UUID
    if (!validateUUID(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid draft ID format",
      });
    }

    const data = saveDraftSchema.parse(req.body);

    // Update the draft
    const message = await saveDraft({
      dealershipId,
      userId,
      draftId: req.params.id,
      to: data.to,
      cc: data.cc,
      bcc: data.bcc,
      subject: data.subject,
      htmlBody: data.htmlBody,
      textBody: data.textBody,
      customerId: data.customerId,
      dealId: data.dealId,
      attachments: data.attachments,
    });

    console.log(`[EmailRoutes] Updated draft ${req.params.id} via PUT`);

    res.status(200).json({
      success: true,
      data: message,
      message: "Draft updated successfully",
    });
  } catch (error) {
    console.error("[EmailRoutes] Error updating draft:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        errors: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update draft",
    });
  }
});
```

## 3. Updated Email Service (server/email-service.ts)

```typescript
export async function saveDraft(
  options: Partial<SendEmailOptions> & {
    dealershipId: string;
    userId: string;
    draftId?: string;
  }
): Promise<EmailMessage> {
  const {
    dealershipId,
    userId,
    draftId,
    to,
    cc,
    bcc,
    subject,
    htmlBody,
    textBody,
    customerId,
    dealId,
    attachments,
  } = options;

  // Update existing draft
  if (draftId) {
    // Check if draft exists and belongs to user
    const existingDraft = await db
      .select()
      .from(emailMessages)
      .where(
        and(
          eq(emailMessages.id, draftId),
          eq(emailMessages.dealershipId, dealershipId),
          eq(emailMessages.userId, userId),
          eq(emailMessages.isDraft, true)
        )
      )
      .limit(1);

    if (existingDraft.length === 0) {
      throw new Error("Draft not found or access denied");
    }

    const [updated] = await db
      .update(emailMessages)
      .set({
        toAddresses: (to || []) as any,
        ccAddresses: (cc || []) as any,
        bccAddresses: (bcc || []) as any,
        subject: subject || existingDraft[0].subject,
        htmlBody: htmlBody !== undefined ? htmlBody : existingDraft[0].htmlBody,
        textBody: textBody !== undefined ? textBody : existingDraft[0].textBody,
        customerId,
        dealId,
        attachments: attachments as any,
        updatedAt: new Date(),
      })
      .where(eq(emailMessages.id, draftId))
      .returning();

    console.log(`[EmailService] Updated draft ${draftId}`);
    return updated;
  }

  // Create new draft with all fields properly set
  const [message] = await db
    .insert(emailMessages)
    .values({
      dealershipId,
      userId,
      fromAddress: "support@autolytiq.com",
      fromName: "Autolytiq Support",
      toAddresses: (to || []) as any,
      ccAddresses: (cc || []) as any,
      bccAddresses: (bcc || []) as any,
      subject: subject || "(No Subject)",
      htmlBody: htmlBody || "",
      textBody: textBody || "",
      folder: "drafts",
      direction: "outbound",
      isRead: true,
      isDraft: true,
      customerId,
      dealId,
      attachments: attachments as any,
    })
    .returning();

  console.log(`[EmailService] Created new draft ${message.id}`);
  return message;
}

/**
 * Send email message
 */
export async function sendEmailMessage(
  options: SendEmailOptions
): Promise<EmailMessage> {
  const {
    dealershipId,
    userId,
    to,
    cc,
    bcc,
    subject,
    htmlBody,
    textBody,
    replyTo,
    customerId,
    dealId,
    attachments,
  } = options;

  // Get verified FROM address from Resend connection
  const verifiedFromAddress = await getVerifiedFromEmail();

  // Send via Resend
  const resendId = await sendViaResend({
    from: verifiedFromAddress,
    to,
    cc,
    bcc,
    subject,
    html: htmlBody,
    text: textBody,
    reply_to: replyTo,
    attachments,
  });

  // Save to sent folder with direction set to outbound
  const [message] = await db
    .insert(emailMessages)
    .values({
      dealershipId,
      userId,
      fromAddress: verifiedFromAddress.split("<")[1]?.replace(">", "") || verifiedFromAddress,
      fromName: verifiedFromAddress.split("<")[0]?.trim() || "Autolytiq Support",
      toAddresses: to as any,
      ccAddresses: (cc || []) as any,
      bccAddresses: (bcc || []) as any,
      subject,
      htmlBody,
      textBody,
      folder: "sent",
      direction: "outbound",
      isRead: true,
      isDraft: false,
      resendId,
      resendStatus: "sent",
      sentAt: new Date(),
      customerId,
      dealId,
      attachments: attachments as any,
    })
    .returning();

  console.log(`[EmailService] Email sent and saved: ${message.id}`);
  return message;
}
```

## 4. Updated Webhook Handler (server/email-webhook-routes.ts)

```typescript
async function handleEmailReceived(data: any) {
  console.log('[EmailWebhook] Processing received email');

  try {
    // Extract email addresses
    const fromEmail = typeof data.from === 'string'
      ? data.from
      : data.from?.email || data.from_email || 'unknown@email.com';

    const toAddresses = Array.isArray(data.to)
      ? data.to.map((addr: any) => ({
          email: typeof addr === 'string' ? addr : addr.email,
          name: typeof addr === 'object' ? addr.name : null,
        }))
      : [];

    const ccAddresses = data.cc
      ? Array.isArray(data.cc)
        ? data.cc.map((addr: any) => ({
            email: typeof addr === 'string' ? addr : addr.email,
            name: typeof addr === 'object' ? addr.name : null,
          }))
        : []
      : [];

    const bccAddresses = data.bcc
      ? Array.isArray(data.bcc)
        ? data.bcc.map((addr: any) => ({
            email: typeof addr === 'string' ? addr : addr.email,
            name: typeof addr === 'object' ? addr.name : null,
          }))
        : []
      : [];

    console.log('[EmailWebhook] Email details:');
    console.log('  From:', fromEmail);
    console.log('  To:', toAddresses);
    console.log('  Subject:', data.subject || '(no subject)');

    // Resolve which dealership this email belongs to (multi-tenant routing)
    let dealershipId = await resolveDealershipFromRecipients(
      toAddresses,
      ccAddresses,
      bccAddresses
    );

    // If no match, use default dealership
    if (!dealershipId) {
      console.warn('[EmailWebhook] No dealership match found, using default dealership...');
      const defaultDealership = await db
        .select({ id: dealershipSettings.id })
        .from(dealershipSettings)
        .limit(1);

      if (defaultDealership.length > 0) {
        dealershipId = defaultDealership[0].id;
        console.log('[EmailWebhook] Using default dealership:', dealershipId);
      } else {
        console.error('[EmailWebhook] No dealership found to save email');
        return;
      }
    }

    // Save inbound email with direction field
    const [savedEmail] = await db.insert(emailMessages).values({
      dealershipId,
      messageId: data.id || data.message_id || `resend-${Date.now()}`,
      threadId: data.thread_id,
      inReplyTo: data.in_reply_to,
      fromAddress: fromEmail,
      fromName: data.from?.name || data.from_name || null,
      toAddresses: toAddresses as any,
      ccAddresses: ccAddresses as any,
      bccAddresses: bccAddresses as any,
      replyTo: data.reply_to,
      subject: data.subject || '(no subject)',
      htmlBody: data.html || data.htmlBody || null,
      textBody: data.text || data.textBody || null,
      folder: 'inbox',
      direction: 'inbound', // Mark as inbound email
      isRead: false,
      isStarred: false,
      isDraft: false,
      resendId: data.id,
      resendStatus: 'received',
      sentAt: data.created_at ? new Date(data.created_at) : new Date(),
      attachments: data.attachments || [],
    }).returning();

    console.log('[EmailWebhook] ✅ Inbound email saved to inbox:', savedEmail.id, data.subject);
  } catch (error) {
    console.error('[EmailWebhook] ❌ Failed to save received email:', error);
    console.error('[EmailWebhook] Email data that failed:', JSON.stringify(data, null, 2));
    // Don't throw - we want to return success to prevent retries
  }
}
```

## 5. Updated Email List Route (server/email-routes.ts)

```typescript
/**
 * GET /api/email/messages
 * List emails with filters - properly handles inbox for inbound emails
 */
router.get("/messages", async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    // @ts-ignore
    const dealershipId = req.user?.dealershipId || "default";

    if (!dealershipId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    // Parse and validate query params
    const queryParams = {
      folder: req.query.folder as string,
      customerId: req.query.customerId as string,
      dealId: req.query.dealId as string,
      isRead: req.query.isRead === "true" ? true : req.query.isRead === "false" ? false : undefined,
      isStarred: req.query.isStarred === "true" ? true : req.query.isStarred === "false" ? false : undefined,
      limit: parseInt(req.query.limit as string) || 50,
      offset: parseInt(req.query.offset as string) || 0,
      search: req.query.search as string,
      direction: req.query.direction as string, // Add direction filter
    };

    // Build query conditions
    const conditions = [
      eq(emailMessages.dealershipId, dealershipId)
    ];

    // For inbox, show only inbound emails
    if (queryParams.folder === 'inbox') {
      conditions.push(eq(emailMessages.folder, 'inbox'));
      conditions.push(eq(emailMessages.direction, 'inbound'));
    } else if (queryParams.folder === 'sent') {
      conditions.push(eq(emailMessages.folder, 'sent'));
      conditions.push(eq(emailMessages.direction, 'outbound'));
    } else if (queryParams.folder === 'drafts') {
      conditions.push(eq(emailMessages.folder, 'drafts'));
      conditions.push(eq(emailMessages.isDraft, true));
    } else if (queryParams.folder) {
      conditions.push(eq(emailMessages.folder, queryParams.folder));
    }

    // Add other filters
    if (queryParams.customerId) {
      conditions.push(eq(emailMessages.customerId, queryParams.customerId));
    }
    if (queryParams.dealId) {
      conditions.push(eq(emailMessages.dealId, queryParams.dealId));
    }
    if (queryParams.isRead !== undefined) {
      conditions.push(eq(emailMessages.isRead, queryParams.isRead));
    }
    if (queryParams.isStarred !== undefined) {
      conditions.push(eq(emailMessages.isStarred, queryParams.isStarred));
    }
    if (queryParams.direction) {
      conditions.push(eq(emailMessages.direction, queryParams.direction));
    }

    // Add search if provided
    if (queryParams.search) {
      conditions.push(
        or(
          like(emailMessages.subject, `%${queryParams.search}%`),
          like(emailMessages.textBody, `%${queryParams.search}%`),
          like(emailMessages.fromAddress, `%${queryParams.search}%`)
        )
      );
    }

    // Get messages
    const messages = await db
      .select()
      .from(emailMessages)
      .where(and(...conditions))
      .orderBy(desc(emailMessages.createdAt))
      .limit(queryParams.limit)
      .offset(queryParams.offset);

    // Get total count
    const countResult = await db
      .select({ count: sql`count(*)` })
      .from(emailMessages)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count || 0);

    console.log(`[EmailRoutes] Found ${messages.length} messages in ${queryParams.folder || 'all folders'}`);

    // Return structured response with pagination metadata
    res.json({
      success: true,
      data: messages,
      total,
      limit: queryParams.limit,
      offset: queryParams.offset,
      folder: queryParams.folder,
    });
  } catch (error) {
    console.error("[EmailRoutes] Error listing emails:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to list emails",
    });
  }
});
```

## Key Changes Summary:

1. **Draft API Updates:**
   - Properly saves and updates htmlBody and textBody
   - Supports draftId parameter for updating existing drafts
   - Added validation to ensure draft exists and user has access
   - Added PUT endpoint for explicit draft updates

2. **Autosave Behavior:**
   - POST /api/email/drafts with draftId updates existing draft
   - POST without draftId creates new draft
   - Returns draft ID for subsequent autosaves

3. **Inbound Email Handling:**
   - Added direction field to schema (needs migration)
   - Webhook sets direction='inbound' for received emails
   - Properly saves all email content fields

4. **Email List API:**
   - Inbox endpoint filters by direction='inbound'
   - Sent folder shows direction='outbound'
   - Added direction as optional query parameter

## Database Migration Required:

```sql
-- Add direction column to email_messages table
ALTER TABLE email_messages
ADD COLUMN direction TEXT NOT NULL DEFAULT 'outbound';

-- Update existing records
UPDATE email_messages
SET direction = CASE
  WHEN folder = 'inbox' THEN 'inbound'
  ELSE 'outbound'
END;
```