import { config } from "dotenv";
import { z } from "zod";

if (process.env.NODE_ENV === "test") {
	config({ path: ".env.test" });
} else {
	config();
}

const envSchema = z.object({
	NODE_ENV: z
		.enum(["development", "test", "production"])
		.default("development"),
	DATABASE_CLIENT: z.enum(["sqlite", "pg"]), // pg = postgres
	DATABASE_URL: z.string(),
	PORT: z.coerce.number().default(3333), // coerce converte para número caso seja de outro tipo
});

export const _env = envSchema.safeParse(process.env);
// safepase, diferente de parse, não lança erro, mas retorna um objeto com sucesso e dados ou erro
// safeParse é usado para validar as variáveis de ambiente e garantir que elas estejam no formato esperado

if (_env.success === false) {
	console.error("Invalid environment variables:", _env.error.format());

	throw new Error("Invalid environment variables");
}

export const env = _env.data;
