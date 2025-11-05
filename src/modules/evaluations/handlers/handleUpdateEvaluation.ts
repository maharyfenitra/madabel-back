import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export const handleUpdateEvaluation = async (
  request: FastifyRequest<{ Params?: { id?: string } }> ,
  reply: FastifyReply
) => {
  try {
    let body = (request.body as any) || {};

    // Normalize multipart wrapper if present
    if (body && typeof body === 'object' && body.fields && typeof body.fields === 'object') {
      body = body.fields;
    }

    const idCandidate = body.id?.value ?? body.id ?? request.params?.id;
    const evaluationId = parseInt(String(idCandidate ?? ''), 10);
    if (isNaN(evaluationId) || evaluationId <= 0) {
      return reply.status(400).send({ error: 'Invalid evaluation id' });
    }

    // Extract fields (support multipart fields with .value)
    const ref = body.ref?.value ?? body.ref;
    const deadlineRaw = body.deadline?.value ?? body.deadline;
    const completedAtRaw = body.completedAt?.value ?? body.completedAt;
    const isCompletedRaw = body.isCompleted?.value ?? body.isCompleted;
    const role = body.role?.value ?? body.role;
    const quizIdRaw = body.quizId?.value ?? body.quizId;

    const parseDate = (d: any): Date | null => {
      if (d == null || d === '') return null;
      const s = String(d);
      // if already ISO or contains time
      if (s.includes('T')) return new Date(s);
      return new Date(s + 'T00:00:00.000Z');
    };

    const dataToUpdate: any = {};
    if (typeof ref !== 'undefined') dataToUpdate.ref = String(ref);
    if (typeof deadlineRaw !== 'undefined') dataToUpdate.deadline = parseDate(deadlineRaw) || undefined;
    if (typeof completedAtRaw !== 'undefined') dataToUpdate.completedAt = parseDate(completedAtRaw) || null;
    if (typeof isCompletedRaw !== 'undefined') {
      // coerce to boolean
      const val = isCompletedRaw === 'true' || isCompletedRaw === true || isCompletedRaw === 1 || isCompletedRaw === '1';
      dataToUpdate.isCompleted = Boolean(val);
    }
    if (typeof role !== 'undefined') dataToUpdate.role = String(role);
    if (typeof quizIdRaw !== 'undefined') {
      const qid = parseInt(String(quizIdRaw), 10);
      dataToUpdate.quizId = isNaN(qid) ? null : qid;
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return reply.status(400).send({ error: 'No data to update' });
    }

    const updated = await prisma.evaluation.update({
      where: { id: evaluationId },
      data: dataToUpdate,
      select: {
        id: true,
        ref: true,
        deadline: true,
        completedAt: true,
        isCompleted: true,
        role: true,
        quizId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return reply.status(200).send({ evaluation: updated });
  } catch (error: any) {
    console.error('❌ Erreur lors de la mise à jour de l\'évaluation:', error);
    // Prisma not found error code
    if (error.code === 'P2025') {
      return reply.status(404).send({ error: 'Evaluation not found' });
    }
    return reply.status(500).send({ error: 'Impossible de mettre à jour l\'évaluation', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

export default handleUpdateEvaluation;
