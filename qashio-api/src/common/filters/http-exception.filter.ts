import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch() // Catch all exceptions.
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = 500;
    let message: unknown = 'Internal server error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (res && typeof res === 'object' && 'message' in res) {
        message = (res as { message?: unknown }).message;
      } else {
        message = res;
      }
    }

    response.status(statusCode).json({
      statusCode,
      message,
      path: request.url,
    });
  }
}

