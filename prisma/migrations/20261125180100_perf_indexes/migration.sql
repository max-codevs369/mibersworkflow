-- CreateIndex
CREATE INDEX "Conversation_imageUrl_idx" ON "Conversation"("imageUrl");

-- CreateIndex
CREATE INDEX "Media_uploadedBy_createdAt_idx" ON "Media"("uploadedBy", "createdAt");

-- CreateIndex
CREATE INDEX "Message_senderId_createdAt_idx" ON "Message"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_replyToId_idx" ON "Message"("replyToId");

-- CreateIndex
CREATE INDEX "Note_authorId_idx" ON "Note"("authorId");
