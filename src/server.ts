import dotenv from "dotenv";
dotenv.config();

import Fastify from "fastify";

const server = Fastify({ logger: true });

import { authRoutes } from "./modules/auths/authRoutes";
import { userRoutes } from "./modules/users/userRoutes";
import { evaluationRoutes } from "./modules/evaluations/evaluationRoutes";
import { quizRoutes } from "./modules/quizzes/quizRoutes";
import { questionRoutes } from "./modules/questions/questionRoutes";

import fastifyStatic from "@fastify/static";
import cors from "@fastify/cors";
import path from "path";

server.register(cors, {
  origin: "*", // ou mettre l’URL de ton frontend, ex: "http://localhost:3000"
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
});

server.register(fastifyStatic, {
  root: path.join(process.cwd(), "public"), // le dossier uploads
  prefix: "/",                       // accessible via http://localhost:3000/uploads/nom_du_fichier
})

server.register(authRoutes);
server.register(userRoutes);
server.register(evaluationRoutes);
server.register(quizRoutes);
server.register(questionRoutes);

// Démarrage du serveur
const start = async () => {
  try {
    await server.listen({ port: 8001, host: "0.0.0.0" });
    console.log("🚀 Serveur démarré sur http://localhost:8001");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
