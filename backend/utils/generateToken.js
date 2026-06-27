import jwt from 'jsonwebtoken';

// Signs a JWT embedding the user's id; used right after register/login
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

export default generateToken;
