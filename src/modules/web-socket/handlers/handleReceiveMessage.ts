import { prisma } from "../../../utils";

export const handleReceiveMessage = async (data: HandleReceiveMessageParams) => {
  const message = await prisma.message.create({ data });
  return message
};

type HandleReceiveMessageParams = {
  receiverId: number;
  senderId: number;
  content: string;
};
