import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes.js';
import { requestRouter } from '../modules/requests/request.routes.js';
import { adminRouter } from '../modules/admin/admin.routes.js';
import { notificationRouter } from '../modules/notifications/notification.routes.js';
import { categoryRouter } from '../modules/categories/category.routes.js';

export const apiRouter = Router();
apiRouter.use('/auth', authRouter);
apiRouter.use('/requests', requestRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/', categoryRouter);
