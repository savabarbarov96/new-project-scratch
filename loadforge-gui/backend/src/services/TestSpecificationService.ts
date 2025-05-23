import { TestSpecificationModel, TestSpecificationDocument } from '../models/TestSpecification.js';
import { TestSpecification, ApiResponse, PaginatedResponse } from '../types/index.js';
import { FileUploadService } from './FileUploadService.js';

// Import WebSocket service - will be injected
let webSocketService: any = null;

export class TestSpecificationService {
  private fileUploadService = new FileUploadService();

  /**
   * Set WebSocket service for real-time updates
   */
  setWebSocketService(wsService: any): void {
    webSocketService = wsService;
  }

  async createTestSpecification(specData: Omit<TestSpecification, '_id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<TestSpecification>> {
    try {
      console.log('🔄 TestSpecificationService: Creating test specification...');
      console.log('📊 Input data:', JSON.stringify(specData, null, 2));
      
      // Validate required fields
      if (!specData.name || !specData.url || !specData.httpMethod || !specData.loadProfile) {
        const missingFields = [];
        if (!specData.name) missingFields.push('name');
        if (!specData.url) missingFields.push('url');
        if (!specData.httpMethod) missingFields.push('httpMethod');
        if (!specData.loadProfile) missingFields.push('loadProfile');
        
        console.error('❌ Missing required fields:', missingFields);
        return {
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`,
        };
      }

      console.log('✅ Input validation passed');
      console.log('💾 Creating MongoDB document...');
      
      const spec = new TestSpecificationModel(specData);
      console.log('📄 Document created, attempting to save...');
      
      const savedSpec = await spec.save();
      console.log('✅ Document saved successfully with ID:', savedSpec._id);
      
      // Emit WebSocket event
      if (webSocketService) {
        console.log('📡 Emitting WebSocket spec-created event...');
        webSocketService.emitSpecCreated((savedSpec._id as any).toString(), savedSpec.name);
      } else {
        console.warn('⚠️ WebSocket service not available for event emission');
      }

      const result = this.documentToTestSpec(savedSpec);
      console.log('🎉 Test specification created successfully:', result._id);

      return {
        success: true,
        data: result,
        message: 'Test specification created successfully',
      };
    } catch (error) {
      console.error('💥 Error in createTestSpecification:', error);
      
      // Log specific MongoDB errors
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        if ('code' in error) {
          console.error('Error code:', (error as any).code);
        }
        if ('keyPattern' in error) {
          console.error('Key pattern:', (error as any).keyPattern);
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create test specification',
      };
    }
  }

  async getTestSpecifications(page: number = 1, limit: number = 10): Promise<PaginatedResponse<TestSpecification>> {
    try {
      console.log(`🔍 TestSpecificationService: Fetching test specifications - page: ${page}, limit: ${limit}`);
      
      const skip = (page - 1) * limit;
      console.log(`📊 Query parameters - skip: ${skip}, limit: ${limit}`);
      
      console.log('💾 Executing MongoDB queries...');
      const [specs, total] = await Promise.all([
        TestSpecificationModel.find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        TestSpecificationModel.countDocuments(),
      ]);

      console.log(`📋 Query results - found ${specs.length} specs, total count: ${total}`);
      
      if (specs.length > 0) {
        console.log('📄 First spec sample:', {
          id: specs[0]._id,
          name: specs[0].name,
          createdAt: (specs[0] as any).createdAt
        });
      } else {
        console.log('📭 No specifications found in database');
      }

      const totalPages = Math.ceil(total / limit);
      console.log(`📊 Pagination - total pages: ${totalPages}`);

      console.log('🔄 Mapping documents to TestSpecification format...');
      const mappedSpecs = specs.map((spec, index) => {
        console.log(`🔄 Mapping spec ${index + 1}/${specs.length}: ${spec._id}`);
        try {
          return this.leanDocumentToTestSpec(spec);
        } catch (error) {
          console.error(`❌ Error mapping spec ${index} (${spec._id}):`, error);
          throw error;
        }
      });

      console.log(`✅ Successfully mapped ${mappedSpecs.length} specifications`);

      return {
        success: true,
        data: mappedSpecs,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      console.error('💥 Error in getTestSpecifications:', error);
      
      // Log specific MongoDB errors
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        if ('code' in error) {
          console.error('Error code:', (error as any).code);
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch test specifications',
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }
  }

  async getTestSpecificationById(id: string): Promise<ApiResponse<TestSpecification>> {
    try {
      const spec = await TestSpecificationModel.findById(id).lean();
      
      if (!spec) {
        return {
          success: false,
          error: 'Test specification not found',
        };
      }

      return {
        success: true,
        data: this.leanDocumentToTestSpec(spec),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch test specification',
      };
    }
  }

  async updateTestSpecification(id: string, updateData: Partial<TestSpecification>): Promise<ApiResponse<TestSpecification>> {
    try {
      const spec = await TestSpecificationModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).lean();

      if (!spec) {
        return {
          success: false,
          error: 'Test specification not found',
        };
      }

      // Emit WebSocket event
      if (webSocketService) {
        webSocketService.emitSpecUpdated(spec._id.toString(), spec.name);
      }

      return {
        success: true,
        data: this.leanDocumentToTestSpec(spec),
        message: 'Test specification updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update test specification',
      };
    }
  }

  async deleteTestSpecification(id: string): Promise<ApiResponse<boolean>> {
    try {
      const spec = await TestSpecificationModel.findById(id);
      if (!spec) {
        return {
          success: false,
          error: 'Test specification not found',
        };
      }

      const specName = spec.name; // Capture name before deletion

      // Clean up associated files if any
      if (spec.body?.type === 'file' && spec.body.fileId) {
        try {
          await this.fileUploadService.deleteFile(spec.body.fileId);
        } catch (error) {
          console.warn(`Failed to delete associated file ${spec.body.fileId}:`, error);
          // Don't fail the deletion if file cleanup fails
        }
      }

      await TestSpecificationModel.findByIdAndDelete(id);

      // Emit WebSocket event
      if (webSocketService) {
        webSocketService.emitSpecDeleted(id, specName);
      }

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete test specification',
      };
    }
  }

  async validateTestSpecification(specData: TestSpecification): Promise<ApiResponse<{ isValid: boolean; errors?: string[] }>> {
    try {
      // Basic URL validation
      try {
        new URL(specData.url);
      } catch {
        return {
          success: true,
          data: {
            isValid: false,
            errors: ['Invalid URL format'],
          },
        };
      }

      // Load profile validation
      const { loadProfile } = specData;
      const errors: string[] = [];

      if (loadProfile.rampUp && loadProfile.rampUp.duration > 0) {
        if (loadProfile.rampUp.startRate < 0 || loadProfile.rampUp.endRate < 0) {
          errors.push('Ramp-up rates must be non-negative');
        }
      }

      if (loadProfile.rampDown && loadProfile.rampDown.duration > 0) {
        if (loadProfile.rampDown.startRate < 0 || loadProfile.rampDown.endRate < 0) {
          errors.push('Ramp-down rates must be non-negative');
        }
      }

      const totalDuration = 
        (loadProfile.rampUp?.duration || 0) +
        loadProfile.steadyState.duration +
        (loadProfile.rampDown?.duration || 0);

      if (totalDuration !== loadProfile.duration) {
        errors.push('Total duration must equal sum of ramp-up, steady-state, and ramp-down durations');
      }

      return {
        success: true,
        data: {
          isValid: errors.length === 0,
          ...(errors.length > 0 && { errors }),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate test specification',
      };
    }
  }

  private documentToTestSpec(doc: TestSpecificationDocument): TestSpecification {
    const result: any = {
      _id: (doc._id as any).toString(),
      name: doc.name,
      description: doc.description,
      httpMethod: doc.httpMethod,
      url: doc.url,
      headers: doc.headers && doc.headers instanceof Map ? Object.fromEntries(doc.headers) : doc.headers,
      queryParams: doc.queryParams && doc.queryParams instanceof Map ? Object.fromEntries(doc.queryParams) : doc.queryParams,
      body: doc.body,
      loadProfile: doc.loadProfile,
      createdAt: (doc as any).createdAt,
      updatedAt: (doc as any).updatedAt,
    };
    return result;
  }

  private leanDocumentToTestSpec(doc: any): TestSpecification {
    const result: any = {
      _id: doc._id.toString(),
      name: doc.name,
      description: doc.description,
      httpMethod: doc.httpMethod,
      url: doc.url,
      headers: doc.headers && doc.headers instanceof Map ? Object.fromEntries(doc.headers) : doc.headers,
      queryParams: doc.queryParams && doc.queryParams instanceof Map ? Object.fromEntries(doc.queryParams) : doc.queryParams,
      body: doc.body,
      loadProfile: doc.loadProfile,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
    return result;
  }
}

export const testSpecificationService = new TestSpecificationService(); 