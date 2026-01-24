import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";
import { hashPassword, generatePassword } from "../../auths/services";
import { reminderService } from "../../config/reminderService";

export const handleAddParticipant = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
   
    const body = request.body as Record<string, any>;

     const name = body.name?.value || body.name;
     const email = body.email?.value || body.email;
     const phone = body.phone?.value || body.phone;
     const role = body.role?.value || body.role;
     const post = body.post?.value || body.post;
     const evaluatorType = body.evaluatorType?.value || body.evaluatorType;
     const evaluationId = body.evaluationId?.value || body.evaluationId;

     let user = await prisma.user.findUnique({ where: {
        email: email
     }})

     if(!user){
        const password = await hashPassword(generatePassword())
        user = await prisma.user.create({
            data: {
                name,
                email,
                post,
                password,
                phone,
                role
            }
        })
     }

     // Check if user is already a participant in this evaluation
     const existingParticipant = await prisma.evaluationParticipant.findUnique({
        where: {
            evaluationId_userId: {
                evaluationId,
                userId: user.id
            }
        }
     })

     if(existingParticipant){
        return reply.status(400).send({
            error: "Cet utilisateur est déjà participant de cette évaluation",
            participant: existingParticipant
        })
     }

     const participant = await prisma.evaluationParticipant.create({
        data: {
            userId: user.id,
            evaluationId,
            participantRole: role,
            evaluatorType
        },
        select: {
            id: true,
            evaluationId: true,
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    phone: true,
                    role: true,
                }
            }
        }
     })

    // Logique d'envoi d'email selon le rôle
    console.log(`🔔 Participant ${participant.id} (${email}) ajouté - Rôle: ${role}`);
    
    try {
      if (role === "CANDIDAT") {
        // Si c'est un CANDIDAT, envoyer son invitation immédiate
        console.log(`📨 Envoi immédiat pour le CANDIDAT ${participant.id}`);
        await reminderService.sendImmediateNotification(participant.id);
        
        // Envoyer aussi les invitations à tous les évaluateurs en attente
        console.log(`📨 Envoi des invitations aux évaluateurs en attente...`);
        const sentCount = await reminderService.sendPendingEvaluatorInvitations(evaluationId);
        console.log(`✅ ${sentCount} invitation(s) envoyée(s) aux évaluateurs`);
      } else if (role === "EVALUATOR") {
        // Si c'est un EVALUATOR, vérifier s'il y a déjà un candidat
        const hasCandidate = await prisma.evaluationParticipant.findFirst({
          where: {
            evaluationId,
            participantRole: "CANDIDAT"
          }
        });
        
        if (hasCandidate) {
          // Il y a un candidat, envoyer l'invitation immédiate
          console.log(`📨 Envoi immédiat pour l'EVALUATOR ${participant.id} (candidat présent)`);
          await reminderService.sendImmediateNotification(participant.id);
        } else {
          // Pas de candidat, l'invitation sera envoyée quand un candidat sera ajouté
          console.log(`⏸️ Pas d'envoi pour l'EVALUATOR ${participant.id} (aucun candidat dans l'évaluation)`);
        }
      }
      
      console.log(`✅ Email immédiat traité pour le participant ${participant.id}`);
    } catch (error) {
      console.error("❌ Erreur lors de l'envoi de l'email immédiat:", error);
      // On continue même si l'email échoue
    }

    return reply.status(200).send({ user, participant});
  } catch (error) {
    console.error("Error creating evaluation:", error);
    return reply.status(500).send({
      error: "Failed to create evaluation",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
