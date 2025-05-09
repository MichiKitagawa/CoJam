import { Express } from 'express-serve-static-core';
import { JwtPayload } from '../config/auth';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      file?: Express.Multer.File;
    }
  }
}

export {}; 