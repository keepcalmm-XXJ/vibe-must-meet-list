import Joi from 'joi';

/**
 * User profile update validation schema
 */
export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional().messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name cannot exceed 100 characters',
  }),
  
  company: Joi.string().max(100).optional().allow('').messages({
    'string.max': 'Company name cannot exceed 100 characters',
  }),
  
  position: Joi.string().max(100).optional().allow('').messages({
    'string.max': 'Position cannot exceed 100 characters',
  }),
  
  industry: Joi.string().max(100).optional().allow('').messages({
    'string.max': 'Industry cannot exceed 100 characters',
  }),
  
  bio: Joi.string().max(500).optional().allow('').messages({
    'string.max': 'Bio cannot exceed 500 characters',
  }),
  
  linkedin_profile: Joi.string().uri().optional().allow('').messages({
    'string.uri': 'LinkedIn profile must be a valid URL',
  }),
  
  skills: Joi.array().items(
    Joi.string().min(1).max(50).messages({
      'string.min': 'Skill cannot be empty',
      'string.max': 'Skill cannot exceed 50 characters',
    })
  ).max(20).optional().messages({
    'array.max': 'Cannot have more than 20 skills',
  }),
  
  interests: Joi.array().items(
    Joi.string().min(1).max(50).messages({
      'string.min': 'Interest cannot be empty',
      'string.max': 'Interest cannot exceed 50 characters',
    })
  ).max(20).optional().messages({
    'array.max': 'Cannot have more than 20 interests',
  }),
  
  business_goals: Joi.array().items(
    Joi.string().min(1).max(100).messages({
      'string.min': 'Business goal cannot be empty',
      'string.max': 'Business goal cannot exceed 100 characters',
    })
  ).max(10).optional().messages({
    'array.max': 'Cannot have more than 10 business goals',
  }),
});

/**
 * Avatar upload validation schema
 */
export const avatarUploadSchema = Joi.object({
  // File validation will be handled by multer middleware
  // This schema is for any additional fields if needed
});