"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const routes_1 = __importDefault(require("./routes"));
const error_1 = require("./middlewares/error");
const app = (0, express_1.default)();
// Middlewares
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
const uploadsDir = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express_1.default.static(uploadsDir));
// Swagger JSDoc Setup
const swaggerOptions = {
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
const swaggerSpec = (0, swagger_jsdoc_1.default)(swaggerOptions);
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec));
// Mount REST routes
app.use('/api', routes_1.default);
// Global Error Handler
app.use(error_1.errorHandler);
exports.default = app;
