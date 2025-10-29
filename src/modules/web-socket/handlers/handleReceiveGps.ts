import { prisma } from "../../../utils";

export const handleReceiveGps = async (
  userId: number,
  data: HandleReceiveGpsParams
) => {
  const gps = await prisma.user.update({ where: { id: userId }, data });
  return gps;
};

type HandleReceiveGpsParams = {
  latitude: number;
  longitude: number;
};
