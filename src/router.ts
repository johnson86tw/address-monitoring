import { Router } from 'itty-router';
import { buildPushPayload, type PushSubscription, type PushMessage, type VapidKeys } from '@block65/webcrypto-web-push';

// now let's create a router (note the lack of "new")
const router = Router();

router.post('/api/save-subscription', async (request, env: Env) => {
	try {
		const content = await request.json();

		const timestamp = Date.now();
		const key = timestamp.toString();

		await env.SUBSCRIPTIONS.put(key, JSON.stringify(content));

		return new Response(`Saved subscription: ${key}`, { status: 200 });
	} catch (err: any) {
		console.error('Failed to save subscription', err);
		return new Response(err, { status: 500 });
	}
});

router.post('/api/webhook', async (request, env: Env) => {
	try {
		const content = await request.json();

		if (content.webhookId !== env.WEBHOOK_ID) {
			return new Response('Not Authorized', { status: 401 });
		}

		const { keys } = await env.SUBSCRIPTIONS.list();

		const vapid: VapidKeys = {
			subject: undefined,
			publicKey: undefined,
			privateKey: env.WEBPUSH_PRIV_KEY,
		};

		for (const key of keys) {
			const sub = await env.SUBSCRIPTIONS.get(key.name);
			if (!sub) continue;

			const subscription: PushSubscription = JSON.parse(sub);

			const message: PushMessage = {
				data: JSON.stringify(content),
				options: {
					ttl: 60,
				},
			};
			const payload = await buildPushPayload(message, subscription, vapid);
			const res = await fetch(subscription.endpoint, payload);

			if (!res.ok) {
				throw new Error('Failed to send push notification');
			}
		}

		return new Response('Webhook received: ' + JSON.stringify(content));
	} catch (err: any) {
		console.error(err);
		return new Response(err, { status: 500 });
	}
});

// GET collection index
// router.get('/api/todos', () => new Response('Todos Index!'));

// // GET item
// router.get('/api/todos/:id', ({ params }) => new Response(`Todo #${params.id}`));

// // POST to the collection (we'll use async here)
// router.post('/api/todos', async (request) => {
// 	const content = await request.json();

// 	return new Response('Creating Todo: ' + JSON.stringify(content));
// });

// 404 for everything else
router.all('*', () => new Response('Not Found.', { status: 404 }));

export default router;
