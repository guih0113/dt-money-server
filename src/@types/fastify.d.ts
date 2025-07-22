// src/@types/fastify.d.ts
import "fastify";

declare module "fastify" {
	interface FastifyRequest {
		sessionId: string;
	}
}
