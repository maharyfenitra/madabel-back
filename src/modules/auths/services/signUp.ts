import { prisma } from "../../../utils"

export const signUp = async (params: SignUpParams) => {
   const user =  await prisma.user.create({ data: params})
   return user
}

type SignUpParams = {
    name: string,
    email: string,
    password: string,
}