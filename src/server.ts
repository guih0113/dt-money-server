import { app } from "./app";
import { env } from "./env";

app
	.listen({
		port: env.PORT,
	})
	.then(() => {
		console.log("HTTP server is running!");
	});

// tsx só é recomendado para desenvolvimento, não para produção, pois js é mais rápido e facil de depurar.
// Para produção, use o comando `tsc` para compilar o TypeScript para JavaScript
// e execute o arquivo JavaScript resultante com Node.js.
// Para rodar o servidor, use o comando `tsx src/server.ts`
// knex (query builder) trata-se de um construtor de consultas SQL para Node.js, que facilita a construção de consultas SQL complexas de forma programática.
// migrations são scripts que permitem modificar o esquema do banco de dados de forma controlada e versionada, facilitando a evolução do banco de dados ao longo do tempo.
// plugins são extensões que adicionam funcionalidades ao Fastify, como suporte a autenticação, validação de dados, entre outros.
