import { body } from 'express-validator';

export const registerValidation = [
  body('username')
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters long.')
    .trim()
    .escape(),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long.')
    .matches(/\d/)
    .withMessage('Password must contain a number.')
    .matches(/[A-Z]/)
    .withMessage('Password must contain an uppercase letter.')
];