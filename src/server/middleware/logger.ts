import { Request, Response, NextFunction } from 'express';

/**
 * Request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  
  // Log request
  console.log(`[${timestamp}] ${req.method} ${req.url} - IP: ${req.ip}`);
  
  // Log request body for non-GET requests (excluding sensitive data)
  if (req.method !== 'GET' && req.body) {
    const sanitizedBody = { ...req.body };
    // Remove sensitive fields from logs
    delete sanitizedBody.password;
    delete sanitizedBody.token;
    delete sanitizedBody.secret;
    
    if (Object.keys(sanitizedBody).length > 0) {
      console.log(`[${timestamp}] Request body:`, JSON.stringify(sanitizedBody, null, 2));
    }
  }
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): Response {
    const duration = Date.now() - start;
    const endTimestamp = new Date().toISOString();
    
    console.log(`[${endTimestamp}] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
    
    // Log error responses
    if (res.statusCode >= 400) {
      console.error(`[${endTimestamp}] Error response: ${res.statusCode} for ${req.method} ${req.url}`);
    }
    
    return originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

/**
 * Error logging middleware
 */
export const errorLogger = (error: Error, req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  
  console.error(`[${timestamp}] ERROR: ${error.message}`);
  console.error(`[${timestamp}] Stack: ${error.stack}`);
  console.error(`[${timestamp}] Request: ${req.method} ${req.url}`);
  console.error(`[${timestamp}] IP: ${req.ip}`);
  console.error(`[${timestamp}] User-Agent: ${req.get('User-Agent')}`);
  
  next(error);
};