import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const generateToken = (id: string | mongoose.Types.ObjectId, role: string = 'user') => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

export default generateToken;
