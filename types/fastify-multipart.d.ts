// types/fastify-multipart.d.ts
import 'fastify';

declare module 'fastify-multipart' {
  import { FastifyPluginAsync } from 'fastify';

  interface FastifyMultipartOptions {
    addToBody?: boolean;
    sharedSchemaId?: string;
    throwFileSizeLimit?: boolean;
    limits?: {
      fieldNameSize?: number;
      fieldSize?: number;
      fields?: number;
      fileSize?: number;
      files?: number;
      headerPairs?: number;
      parts?: number;
    };
  }

  const fastifyMultipart: FastifyPluginAsync<FastifyMultipartOptions>;
  export default fastifyMultipart;
}

// Déclarations pour les types Fastify
declare module 'fastify' {
  interface FastifyRequest {
    file(): Promise<MultipartFile | undefined>;
    files(): AsyncIterable<MultipartFile>;
  }
}

export interface MultipartFile {
  fieldname: string;
  filename: string;
  encoding: string;
  mimetype: string;
  file: NodeJS.ReadableStream;
  fields: Record<string, any>;
  toBuffer(): Promise<Buffer>;
  toJSON(): any;
}