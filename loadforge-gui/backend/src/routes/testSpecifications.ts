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
      console.log('📝 Creating test specification with data:', JSON.stringify(request.body, null, 2));
      
      const result = await testSpecificationService.createTestSpecification(request.body);
      
      console.log('📝 Test specification creation result:', {
        success: result.success,
        hasData: !!result.data,
        dataId: result.data?._id,
        error: result.error
      });
      
      if (result.success) {
        console.log('✅ Test specification created successfully:', result.data?._id);
        reply.code(201).send(result);
      } else {
        console.error('❌ Test specification creation failed:', result.error);
        reply.code(400).send(result);
      }
    } catch (error) {
      console.error('💥 Exception in test specification creation:', error);
      fastify.log.error('Test specification creation error:', error);
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
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
      console.log(`📋 Fetching test specifications - page: ${page}, limit: ${limit}`);
      
      const result = await testSpecificationService.getTestSpecifications(page, limit);
      
      console.log(`📋 Test specifications fetch result:`, {
        success: result.success,
        count: result.data?.length || 0,
        total: result.pagination?.total || 0,
        error: result.error
      });
      
      reply.send(result);
    } catch (error) {
      console.error('💥 Exception in test specifications fetch:', error);
      fastify.log.error('Test specifications fetch error:', error);
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  });

  // Get test specification by ID
  fastify.get<GetSpecRequest>('/specs/:id', async (request: FastifyRequest<GetSpecRequest>, reply: FastifyReply) => {
    try {
      console.log(`📄 Fetching test specification by ID: ${request.params.id}`);
      
      const result = await testSpecificationService.getTestSpecificationById(request.params.id);
      
      console.log(`📄 Test specification fetch by ID result:`, {
        success: result.success,
        hasData: !!result.data,
        error: result.error
      });
      
      if (result.success) {
        reply.send(result);
      } else {
        reply.code(404).send(result);
      }
    } catch (error) {
      console.error('💥 Exception in test specification fetch by ID:', error);
      fastify.log.error('Test specification fetch by ID error:', error);
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
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
      console.log(`📝 Updating test specification ${request.params.id} with data:`, JSON.stringify(request.body, null, 2));
      
      const result = await testSpecificationService.updateTestSpecification(
        request.params.id,
        request.body
      );
      
      console.log(`📝 Test specification update result:`, {
        success: result.success,
        hasData: !!result.data,
        error: result.error
      });
      
      if (result.success) {
        reply.send(result);
      } else {
        reply.code(404).send(result);
      }
    } catch (error) {
      console.error('💥 Exception in test specification update:', error);
      fastify.log.error('Test specification update error:', error);
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  });

  // Delete test specification
  fastify.delete<GetSpecRequest>('/specs/:id', async (request: FastifyRequest<GetSpecRequest>, reply: FastifyReply) => {
    try {
      console.log(`🗑️ Deleting test specification: ${request.params.id}`);
      
      const result = await testSpecificationService.deleteTestSpecification(request.params.id);
      
      console.log(`🗑️ Test specification deletion result:`, {
        success: result.success,
        error: result.error
      });
      
      if (result.success) {
        reply.send(result);
      } else {
        reply.code(404).send(result);
      }
    } catch (error) {
      console.error('💥 Exception in test specification deletion:', error);
      fastify.log.error('Test specification deletion error:', error);
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
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
      console.log(`✅ Validating test specification with data:`, JSON.stringify(request.body, null, 2));
      
      const result = await testSpecificationService.validateTestSpecification(request.body as any);
      
      console.log(`✅ Test specification validation result:`, {
        success: result.success,
        isValid: result.data?.isValid,
        errors: result.data?.errors,
        error: result.error
      });
      
      reply.send(result);
    } catch (error) {
      console.error('💥 Exception in test specification validation:', error);
      fastify.log.error('Test specification validation error:', error);
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  });
} 