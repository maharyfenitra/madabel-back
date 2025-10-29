import type { FastifyInstance } from "fastify";
import { Server as SocketIOServer } from "socket.io";
import { verifyJWT } from "../auths/services"; // ✅ on garde ton nom exact
import { handleReceiveMessage } from "./handlers/handleReceiveMessage";
import { handleReceiveGps } from "./handlers/handleReceiveGps";

export async function socketRoutes(fastify: FastifyInstance) {
  // ⚡ Initialisation de Socket.IO sur le serveur Fastify
  const io = new SocketIOServer(fastify.server, {
    path: "/test/",
    cors: {
      origin: "*", // à restreindre selon ton front
    },
  });

  // Map pour stocker les sockets par userId
  const clients = new Map<string, any>();

  // ✅ Vérification du JWT au moment du handshake Socket.IO

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Token manquant"));
    }

    // On crée un faux objet request/reply pour réutiliser ton verifyJWT existant
    const fakeRequest: any = { headers: { authorization: `Bearer ${token}` } };
    const fakeReply: any = {
      status: () => ({ send: () => {} }),
    };

    try {
      // Ton middleware d’authentification
      await verifyJWT(fakeRequest, fakeReply);

      // Récupération du payload ajouté par verifyJWT
      const userPayload = fakeRequest.user;
      (socket as any).user = userPayload;
      next();
    } catch (err) {
      next(new Error("Token invalide"));
    }
  });

  // ✅ Lorsqu’un client se connecte
  io.on("connection", (socket) => {
    const userPayload = (socket as any).user;
    const userId = userPayload?.userId;

    if (!userId) {
      socket.disconnect(true);
      return;
    }

    console.log(`✅ Client connecté (userId: ${userId})`);
    clients.set(userId, socket);

    // Envoi d’un message de bienvenue
    socket.emit("message", { msg: "Connexion Socket.IO réussie 🎉" });

    // 🔁 Réception de messages
    socket.on("message", async (msg) => {
      try {

        switch (msg.type){
            case "sendMessage":
               const message = await handleReceiveMessage({senderId: userId, ...msg.data})
               
               const targetClient = clients.get(msg.data.receiverId)
               console.log(userId)
               console.log(msg.data.receiverId)
               console.log(message)
               targetClient?.emit?.("message", { type: "sendMessage", data: message} )
            break

            case "sendGps":
              const gps  = await handleReceiveGps(userId, { ...msg.data})
              console.log(gps)
            
            break

            default:
                console.log(msg)

        }
            
      
      } catch (err) {
        console.error("Erreur parsing message :", err);
      }
    });

    // 🔌 Déconnexion
    socket.on("disconnect", () => {
      console.log(`❌ Client déconnecté (userId: ${userId})`);
      clients.delete(userId);
    });
  });

  // ✅ Décoration Fastify : envoi serveur → userId
  fastify.decorate("sendToUser", (userId: string, data: any) => {
    const client = clients.get(userId);
    if (client) {
      client.emit("server_message", data);
    }
  });

  console.log("🚀 Socket.IO prêt sur /test/");
}
