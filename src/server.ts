import dotenv from "dotenv";
dotenv.config();

import Fastify from "fastify";

const server = Fastify({ logger: true });

import { authRoutes } from "./modules/auths/authRoutes";
import { userRoutes } from "./modules/users/userRoutes";
import { evaluationRoutes } from "./modules/evaluations/evaluationRoutes";
import { quizRoutes } from "./modules/quizzes/quizRoutes";
import { candidateEvaluationRoutes } from "./modules/candidate-evaluations/candidateEvaluationRoutes";
import { questionRoutes } from "./modules/questions/questionRoutes";
import { reportRoutes } from "./modules/reports/reportRoutes";
import { profileRoutes } from "./modules/profiles/profile";
import { configRoutes } from "./modules/config/configRoutes";
import { reminderService } from "./modules/config/reminderService";

import fastifyStatic from "@fastify/static";
import cors from "@fastify/cors";
import path from "path";

server.register(cors, {
  origin: true, // Accepte toutes les origines en dev, ou spécifier "http://localhost:3000" en prod
  credentials: true, // Permet l'envoi de cookies et credentials
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"], // Autorise le header Authorization
  exposedHeaders: ["Authorization"],
});

server.register(fastifyStatic, {
  root: path.join(process.cwd(), "public"),
  prefix: "/",
})

server.register(authRoutes);
server.register(userRoutes);
server.register(evaluationRoutes);
server.register(quizRoutes);
server.register(candidateEvaluationRoutes);
server.register(questionRoutes);
server.register(reportRoutes);
server.register(profileRoutes);
server.register(configRoutes);

// Démarrage du serveur
const start = async () => {
  try {
    await server.listen({ port: 8001, host: "0.0.0.0" });
    console.log("🚀 Serveur démarré sur http://localhost:8001");
    
    // Démarrer le service de relance automatique
    await reminderService.start();
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
