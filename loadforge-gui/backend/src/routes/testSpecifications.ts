import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { testSpecificationService } from '../services/TestSpecificationService.js';
import { 
  testSpecificationSchema, 
  updateTestSpecificationSchema, 
  paginationSchema 
} from '../utils/validation.js';

interface CreateSpecRequest {
  Body: {
    name: string;
    description?: string;
    httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
    url: string;
    headers?: Record<string, string>;
    queryParams?: Record<string, string>;
    body?: {
      type: 'raw' | 'file';
      content?: string;
      fileId?: string;
      fileName?: string;
    };
    loadProfile: any;
  };
}

interface UpdateSpecRequest {
  Params: { id: string };
  Body: Partial<CreateSpecRequest['Body']>;
}

interface GetSpecRequest {
  Params: { id: string };
}

interface ListSpecsRequest {
  Querystring: {
    page?: number;
    limit?: number;
  };
}

export async function testSpecificationRoutes(fastify: FastifyInstance) {
  // Create test specification
  fastify.post<CreateSpecRequest>('/specs', {
    schema: {
      body: testSpecificationSchema,
    },
  }, async (request: FastifyRequest<CreateSpecRequest>, reply: FastifyReply) => {
    try {
      const result = await testSpecificationService.createTestSpecification(request.body);
      
      if (result.success) {
        reply.code(201).send(result);
      } else {
        reply.code(400).send(result);
      }
    } catch (error) {
      reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // Get all test specifications
  fastify.get<ListSpecsRequest>('/specs', {
    schema: {
      querystring: paginationSchema,
    },
  }, async (request: FastifyRequest<ListSpecsRequest>, reply: FastifyReply) => {
    try {
      const { page = 1, limit = 10 } = request.query;
      const result = await testSpecificationService.getTestSpecifications(page, limit);
      
      reply.send(result);
    } catch (error) {
      reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // Get test specification by ID
  fastify.get<GetSpecRequest>('/specs/:id', async (request: FastifyRequest<GetSpecRequest>, reply: FastifyReply) => {
    try {
      const result = await testSpecificationService.getTestSpecificationById(request.params.id);
      
      if (result.success) {
        reply.send(result);
      } else {
        reply.code(404).send(result);
      }
    } catch (error) {
      reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // Update test specification
  fastify.put<UpdateSpecRequest>('/specs/:id', {
    schema: {
      body: updateTestSpecificationSchema,
    },
  }, async (request: FastifyRequest<UpdateSpecRequest>, reply: FastifyReply) => {
    try {
      const result = await testSpecificationService.updateTestSpecification(
        request.params.id,
        request.body
      );
      
      if (result.success) {
        reply.send(result);
      } else {
        reply.code(404).send(result);
      }
    } catch (error) {
      reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // Delete test specification
  fastify.delete<GetSpecRequest>('/specs/:id', async (request: FastifyRequest<GetSpecRequest>, reply: FastifyReply) => {
    try {
      const result = await testSpecificationService.deleteTestSpecification(request.params.id);
      
      if (result.success) {
        reply.send(result);
      } else {
        reply.code(404).send(result);
      }
    } catch (error) {
      reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // Validate test specification
  fastify.post<CreateSpecRequest>('/specs/:id/validate', {
    schema: {
      body: testSpecificationSchema,
    },
  }, async (request: FastifyRequest<CreateSpecRequest>, reply: FastifyReply) => {
    try {
      const result = await testSpecificationService.validateTestSpecification(request.body as any);
      reply.send(result);
    } catch (error) {
      reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });
} 