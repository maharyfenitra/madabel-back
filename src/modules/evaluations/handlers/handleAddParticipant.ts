import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";
import { hashPassword, generatePassword } from "../../auths/services";

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

    return reply.status(200).send({ user, participant});
  } catch (error) {
    console.error("Error creating evaluation:", error);
    return reply.status(500).send({
      error: "Failed to create evaluation",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
