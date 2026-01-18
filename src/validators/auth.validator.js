const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name must not exceed 100 characters',
    'any.required': 'Name is required',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required',
  }),
  role: Joi.string()
    .valid('FELLOW', 'MENTOR', 'COMMUNITY_ADMIN')
    .default('FELLOW'),
  // Mentor specific fields
  title: Joi.string().when('role', {
    is: 'MENTOR',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  company: Joi.string().when('role', {
    is: 'MENTOR',
    then: Joi.optional(),
    otherwise: Joi.forbidden(),
  }),
  expertise: Joi.array().items(Joi.string()).when('role', {
    is: 'MENTOR',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  bio: Joi.string().max(1000).optional(),
  // Community admin specific fields
  communityName: Joi.string().when('role', {
    is: 'COMMUNITY_ADMIN',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  avatar: Joi.string().uri().optional().allow('', null),
  bio: Joi.string().max(1000).optional().allow('', null),
  department: Joi.string().max(100).optional().allow('', null),
  team: Joi.string().max(100).optional().allow('', null),
  interests: Joi.array().items(Joi.string()).optional(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required',
  }),
  newPassword: Joi.string().min(6).required().messages({
    'string.min': 'New password must be at least 6 characters long',
    'any.required': 'New password is required',
  }),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Passwords do not match',
    'any.required': 'Password confirmation is required',
  }),
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
};
