import express from 'express';
import cors from 'cors';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import fs from 'fs';
import routes from './routes';
import { errorHandler } from './middlewares/error';

const app = express();

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Swagger JSDoc Setup
const swaggerOptions: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Setu AI API Documentation',
      version: '1.0.0',
      description: 'Setu AI Multi-Tenant Production SaaS API details.',
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:5000',
        description: 'Setu AI Backend Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './dist/routes/*.js', './src/routes/**/*.ts'],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount REST routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

export default app;
