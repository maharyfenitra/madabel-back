import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../../utils";

export const handleGetNearestDrivers = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  // logique pour récupérer les conducteurs les plus proches
  const drivers = await prisma.user.findMany({
    where: { isAvailable: true, role: "DRIVER" },
    
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true,
      pricings: {
        select: {
          pricePerKm: true
        }
      }
    },
  });

  return drivers;
};
