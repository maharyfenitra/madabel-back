import type { FastifyReply, FastifyRequest } from "fastify";
import { upload } from "../../service";
import { prisma } from "../../../utils";

export const handleUpdateMyProfile = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    if (!request.isMultipart()) {
      return reply
        .status(400)
        .send({ error: "Content-Type must be multipart/form-data" });
    }
    const userPayload = (request as any).user;

    const body = request.body as Record<string, any>;

    // Récupérer les champs texte correctement
    const name = body.name?.value || body.name;
    const email = body.email?.value || body.email;
    const phone = body.phone?.value || body.phone;
    const price = Number(body.price?.value || body.price);
    const brand = body.vehicleBrand.value || body.vehicleBrand;
    const type = body.vehicleType.value || body.vehicleType;
    const registration =
      body.vehicleRegistration.value || body.vehicleRegistration;

    const avatarFileName = body.avatar
      ? await upload(body.avatar, "avatars")
      : null;

    const vehicleFileName = body.vehicleImage
      ? await upload(body.vehicleImage, "photos")
      : null;

    const user = await prisma.user.update({
      where: { id: userPayload.userId },
      data: {
        avatar: avatarFileName,
        name,
        email,
        phone,
      },
    });
    if (user.role == "DRIVER") {
      let vehicle = await prisma.vehicle.findFirst({
        where: {
          ownerId: userPayload.userId,
        },
      });

      if (vehicle) {
        await prisma.vehicle.update({
          where: {
            id: vehicle.id,
          },
          data: {
            photo: vehicleFileName,
            brand,
            type,
            registration,
          },
        });
      } else {
        vehicle = await prisma.vehicle.create({
          data: {
            ownerId: userPayload.userId,
            brand: brand,
            photo: vehicleFileName,
            type: type,
            registration: registration,
          },
        });
      }

      const pricings = await prisma.pricing.findFirst({
        where: {
          driverId: userPayload.userId,
          vehicleId: vehicle.id,
        },
      });

      if (pricings) {
        await prisma.pricing.update({
          where: { id: pricings.id },
          data: {
            pricePerKm: price,
          },
        });
      } else {
        await prisma.pricing.create({
          data: {
            pricePerKm: price,
            driverId: userPayload.userId,
          },
        });
      }
    }

    return reply.status(200).send({});
  } catch (error: any) {
    console.log(error);
    reply.send(402).send(error);
  }
};
