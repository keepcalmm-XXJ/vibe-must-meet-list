import Joi from 'joi';

/**
 * User registration validation schema
 */
export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
      'any.required': 'Password is required',
    }),
  
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name cannot exceed 100 characters',
    'any.required': 'Name is required',
  }),
  
  company: Joi.string().max(100).optional().allow(''),
  
  position: Joi.string().max(100).optional().allow(''),
  
  industry: Joi.string().max(100).optional().allow(''),
  
  bio: Joi.string().max(500).optional().allow(''),
  
  linkedin_profile: Joi.string().uri().optional().allow('').messages({
    'string.uri': 'LinkedIn profile must be a valid URL',
  }),
});

/**
 * User login validation schema
 */
export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

/**
 * Token refresh validation schema
 */
export const refreshTokenSchema = Joi.object({
  // No body validation needed for refresh token - user comes from JWT
});