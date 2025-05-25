import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ApiResponse, PaginatedResponse, TestRun } from '../types/index.js';

// Import the global testRunService instance
let testRunService: any = null;

// Function to set the testRunService instance
export function setTestRunService(service: any) {
  testRunService = service;
}

interface StartTestRequest {
  Body: {
    specId: string;
  };
}

interface TestRunParams {
  Params: {
    id: string;
  };
}

interface TestRunQuery {
  Querystring: {
    page?: string;
    limit?: string;
    specId?: string;
  };
}

export async function testRunRoutes(fastify: FastifyInstance) {
  // POST /api/tests/run - Start test execution
  fastify.post<StartTestRequest>('/tests/run', async (request: FastifyRequest<StartTestRequest>, reply: FastifyReply) => {
    try {
      if (!testRunService) {
        return reply.status(500).send({
          success: false,
          error: 'Test run service not initialized',
        } as ApiResponse);
      }

      const { specId } = request.body;

      if (!specId) {
        return reply.status(400).send({
          success: false,
          error: 'specId is required',
        } as ApiResponse);
      }

      const testRun = await testRunService.startTestRun(specId);

      return reply.status(201).send({
        success: true,
        data: testRun,
        message: 'Test run started successfully',
      } as ApiResponse<TestRun>);
    } catch (error) {
      console.error('Error starting test run:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start test run',
      } as ApiResponse);
    }
  });

  // GET /api/tests/:id/status - Get test status
  fastify.get<TestRunParams>('/tests/:id/status', async (request: FastifyRequest<TestRunParams>, reply: FastifyReply) => {
    try {
      if (!testRunService) {
        return reply.status(500).send({
          success: false,
          error: 'Test run service not initialized',
        } as ApiResponse);
      }

      const { id } = request.params;
      const status = await testRunService.getTestRunStatus(id);

      return reply.send({
        success: true,
        data: status,
      } as ApiResponse);
    } catch (error) {
      console.error('Error getting test status:', error);
      return reply.status(404).send({
        success: false,
        error: error instanceof Error ? error.message : 'Test run not found',
      } as ApiResponse);
    }
  });

  // POST /api/tests/:id/stop - Stop running test
  fastify.post<TestRunParams>('/tests/:id/stop', async (request: FastifyRequest<TestRunParams>, reply: FastifyReply) => {
    try {
      if (!testRunService) {
        return reply.status(500).send({
          success: false,
          error: 'Test run service not initialized',
        } as ApiResponse);
      }

      const { id } = request.params;
      const stopped = await testRunService.stopTestRun(id);

      if (!stopped) {
        return reply.status(400).send({
          success: false,
          error: 'Test could not be stopped',
        } as ApiResponse);
      }

      return reply.send({
        success: true,
        message: 'Test run stopped successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Error stopping test run:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop test run',
      } as ApiResponse);
    }
  });

  // GET /api/tests - List test runs
  fastify.get<TestRunQuery>('/tests', async (request: FastifyRequest<TestRunQuery>, reply: FastifyReply) => {
    try {
      if (!testRunService) {
        return reply.status(500).send({
          success: false,
          error: 'Test run service not initialized',
          data: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
          },
        } as PaginatedResponse<TestRun>);
      }

      const page = parseInt(request.query.page || '1', 10);
      const limit = parseInt(request.query.limit || '10', 10);
      const { specId } = request.query;

      let result;
      if (specId) {
        result = await testRunService.getTestRunsBySpec(specId, page, limit);
      } else {
        result = await testRunService.getTestRuns(page, limit);
      }

      return reply.send({
        success: true,
        data: result.testRuns,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      } as PaginatedResponse<TestRun>);
    } catch (error) {
      console.error('Error listing test runs:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list test runs',
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      } as PaginatedResponse<TestRun>);
    }
  });

  // GET /api/tests/:id - Get specific test run
  fastify.get<TestRunParams>('/tests/:id', async (request: FastifyRequest<TestRunParams>, reply: FastifyReply) => {
    try {
      if (!testRunService) {
        return reply.status(500).send({
          success: false,
          error: 'Test run service not initialized',
        } as ApiResponse);
      }

      const { id } = request.params;
      const testRun = await testRunService.getTestRun(id);

      return reply.send({
        success: true,
        data: testRun,
      } as ApiResponse<TestRun>);
    } catch (error) {
      console.error('Error getting test run:', error);
      return reply.status(404).send({
        success: false,
        error: error instanceof Error ? error.message : 'Test run not found',
      } as ApiResponse);
    }
  });

  // DELETE /api/tests/:id - Cancel/delete test run
  fastify.delete<TestRunParams>('/tests/:id', async (request: FastifyRequest<TestRunParams>, reply: FastifyReply) => {
    try {
      if (!testRunService) {
        return reply.status(500).send({
          success: false,
          error: 'Test run service not initialized',
        } as ApiResponse);
      }

      const { id } = request.params;
      const deleted = await testRunService.deleteTestRun(id);

      if (!deleted) {
        return reply.status(404).send({
          success: false,
          error: 'Test run not found',
        } as ApiResponse);
      }

      return reply.send({
        success: true,
        message: 'Test run deleted successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Error deleting test run:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete test run',
      } as ApiResponse);
    }
  });
} 