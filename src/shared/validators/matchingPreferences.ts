import Joi from 'joi';
import { CompanySize, ExperienceLevel } from '../types/Matching';

const companySizes: CompanySize[] = ['STARTUP', 'SME', 'ENTERPRISE'];
const experienceLevels: ExperienceLevel[] = ['JUNIOR', 'MID', 'SENIOR', 'EXECUTIVE'];

export const matchingPreferencesSchema = Joi.object({
  target_positions: Joi.array()
    .items(Joi.string().trim().min(1).max(100))
    .min(0)
    .max(20)
    .required()
    .messages({
      'array.base': 'Target positions must be an array',
      'array.max': 'Maximum 20 target positions allowed',
      'string.empty': 'Target position cannot be empty',
      'string.max': 'Target position cannot exceed 100 characters',
    }),

  target_industries: Joi.array()
    .items(Joi.string().trim().min(1).max(100))
    .min(0)
    .max(20)
    .required()
    .messages({
      'array.base': 'Target industries must be an array',
      'array.max': 'Maximum 20 target industries allowed',
      'string.empty': 'Target industry cannot be empty',
      'string.max': 'Target industry cannot exceed 100 characters',
    }),

  company_size_preference: Joi.array()
    .items(Joi.string().valid(...companySizes))
    .min(0)
    .max(companySizes.length)
    .required()
    .messages({
      'array.base': 'Company size preference must be an array',
      'any.only': `Company size must be one of: ${companySizes.join(', ')}`,
    }),

  experience_level_preference: Joi.array()
    .items(Joi.string().valid(...experienceLevels))
    .min(0)
    .max(experienceLevels.length)
    .required()
    .messages({
      'array.base': 'Experience level preference must be an array',
      'any.only': `Experience level must be one of: ${experienceLevels.join(', ')}`,
    }),

  business_goal_alignment: Joi.array()
    .items(Joi.string().trim().min(1).max(200))
    .min(0)
    .max(10)
    .required()
    .messages({
      'array.base': 'Business goal alignment must be an array',
      'array.max': 'Maximum 10 business goals allowed',
      'string.empty': 'Business goal cannot be empty',
      'string.max': 'Business goal cannot exceed 200 characters',
    }),

  geographic_preference: Joi.array()
    .items(Joi.string().trim().min(1).max(100))
    .min(0)
    .max(10)
    .optional()
    .messages({
      'array.base': 'Geographic preference must be an array',
      'array.max': 'Maximum 10 geographic preferences allowed',
      'string.empty': 'Geographic preference cannot be empty',
      'string.max': 'Geographic preference cannot exceed 100 characters',
    }),
});

export const updateMatchingPreferencesSchema = matchingPreferencesSchema;