import { OpenAPIHono } from '@hono/zod-openapi';
import { type HonoEnv } from '../../../types/hono';
import { authMiddleware } from '../../../middleware/auth';
import {
    getConversationsRoute,
    getConversationsRouteHandler,
} from './controllers/get-conversations.controller';
import {
    getConversationMessagesRoute,
    getConversationMessagesRouteHandler,
} from './controllers/get-conversation-messages.controller';
import {
    createDirectConversationRoute,
    createDirectConversationRouteHandler,
} from './controllers/create-direct-conversation.controller';
import { sendMessageRoute, sendMessageRouteHandler } from './controllers/send-message.controller';
import {
    markConversationReadRoute,
    markConversationReadRouteHandler,
} from './controllers/mark-conversation-read.controller';
import {
    getMessageRecipientsRoute,
    getMessageRecipientsRouteHandler,
} from './controllers/get-message-recipients.controller';

const messagesRoutes = new OpenAPIHono<HonoEnv>();

messagesRoutes.use('*', authMiddleware);

messagesRoutes
    .openapi(getMessageRecipientsRoute, getMessageRecipientsRouteHandler)
    .openapi(getConversationsRoute, getConversationsRouteHandler)
    .openapi(getConversationMessagesRoute, getConversationMessagesRouteHandler)
    .openapi(createDirectConversationRoute, createDirectConversationRouteHandler)
    .openapi(sendMessageRoute, sendMessageRouteHandler)
    .openapi(markConversationReadRoute, markConversationReadRouteHandler);

export default messagesRoutes;
