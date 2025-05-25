import Joi from 'joi';

export const loadProfileSchema = Joi.object({
  type: Joi.string().valid('custom', 'spike', 'step', 'soak').required(),
  duration: Joi.number().min(1).required(),
  rampUp: Joi.object({
    duration: Joi.number().min(0),
    startRate: Joi.number().min(0),
    endRate: Joi.number().min(0),
  }).optional(),
  steadyState: Joi.object({
    duration: Joi.number().min(1).required(),
    requestsPerSecond: Joi.number().min(0.1).required(),
  }).required(),
  rampDown: Joi.object({
    duration: Joi.number().min(0),
    startRate: Joi.number().min(0),
    endRate: Joi.number().min(0),
  }).optional(),
});

export const testSpecificationSchema = Joi.object({
  name: Joi.string().trim().max(100).required(),
  description: Joi.string().trim().max(500).optional(),
  httpMethod: Joi.string().valid('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS').required(),
  url: Joi.string().uri().required(),
  headers: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  queryParams: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  body: Joi.object({
    type: Joi.string().valid('raw', 'file').required(),
    content: Joi.string().when('type', {
      is: 'raw',
      then: Joi.optional(),
      otherwise: Joi.forbidden(),
    }),
    fileId: Joi.string().when('type', {
      is: 'file',
      then: Joi.optional(),
      otherwise: Joi.forbidden(),
    }),
    fileName: Joi.string().when('type', {
      is: 'file',
      then: Joi.optional(),
      otherwise: Joi.forbidden(),
    }),
  }).optional(),
  loadProfile: loadProfileSchema.required(),
});

export const updateTestSpecificationSchema = testSpecificationSchema.fork(
  ['name', 'httpMethod', 'url', 'loadProfile'],
  (schema) => schema.optional()
);

export const paginationSchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10),
});

export const testRunQuerySchema = Joi.object({
  specId: Joi.string().optional(),
  status: Joi.string().valid('pending', 'running', 'completed', 'failed', 'cancelled').optional(),
}).concat(paginationSchema);

export const fileUploadSchema = Joi.object({
  filename: Joi.string().required(),
  mimetype: Joi.string().required(),
  size: Joi.number().max(26214400).required(), // 25MB max
});

export const scheduledTestSchema = Joi.object({
  specId: Joi.string().required(),
  cronExpression: Joi.string().required(),
  isActive: Joi.boolean().default(true),
}); 