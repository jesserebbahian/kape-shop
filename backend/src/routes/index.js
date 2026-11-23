import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter, aiLimiter } from '../middleware/security.js';
import { asyncHandler as h } from '../utils/asyncHandler.js';
import * as s from '../validators/schemas.js';
import { authController } from '../controllers/authController.js';
import { catalogController } from '../controllers/catalogController.js';
import { cartController } from '../controllers/cartController.js';
import { orderController } from '../controllers/orderController.js';
import { aiController } from '../controllers/aiController.js';
import { adminController } from '../controllers/adminController.js';
import { webhookController } from '../controllers/webhookController.js';

export const webhookRouter = express.Router();
webhookRouter.post('/:provider', validate(s.providerParams, 'params'), h(webhookController.receive));

export const apiRouter = express.Router();

apiRouter.post('/auth/register', authLimiter, validate(s.registerBody), h(authController.register));
apiRouter.post('/auth/login', authLimiter, validate(s.loginBody), h(authController.login));
apiRouter.get('/auth/me', authenticate, authController.me);

apiRouter.get('/products', validate(s.productQuery, 'query'), h(catalogController.list));
apiRouter.get('/products/:id', validate(s.idParams, 'params'), h(catalogController.detail));
apiRouter.get('/batches', h(catalogController.openBatches));

apiRouter.post('/ai/discover', aiLimiter, validate(s.aiBody), h(aiController.discover));

apiRouter.get('/cart', authenticate, h(cartController.view));
apiRouter.post('/cart/items', authenticate, validate(s.cartItemBody), h(cartController.add));
apiRouter.patch('/cart/items/:id', authenticate, validate(s.idParams, 'params'), validate(s.cartPatchBody), h(cartController.update));
apiRouter.delete('/cart/items/:id', authenticate, validate(s.idParams, 'params'), h(cartController.remove));
apiRouter.post('/checkout/quote', authenticate, validate(s.quoteBody), h(cartController.quote));
apiRouter.post('/checkout', authenticate, validate(s.checkoutBody), h(cartController.checkout));
apiRouter.get('/orders', authenticate, h(orderController.list));
apiRouter.get('/orders/:id', authenticate, validate(s.idParams, 'params'), h(orderController.detail));
apiRouter.post('/orders/:id/cancel', authenticate, validate(s.idParams, 'params'), h(orderController.cancel));
apiRouter.post('/orders/:id/reconcile', authenticate, validate(s.idParams, 'params'), h(orderController.reconcile));

const admin = express.Router();
admin.use(authenticate, requireRole('admin'));
admin.get('/dashboard', h(adminController.dashboard));
admin.get('/products', validate(s.productQuery, 'query'), h(adminController.listProducts));
admin.post('/products', validate(s.productBody), h(adminController.createProduct));
admin.patch('/products/:id', validate(s.idParams, 'params'), validate(s.productPatch), h(adminController.updateProduct));
admin.delete('/products/:id', validate(s.idParams, 'params'), h(adminController.deleteProduct));
admin.get('/batches', h(adminController.listBatches));
admin.post('/batches', validate(s.batchBody), h(adminController.createBatch));
admin.post('/batches/:id/adjust', validate(s.idParams, 'params'), validate(s.adjustBody), h(adminController.adjustBatch));
admin.get('/inventory-log', h(adminController.inventoryLog));
admin.get('/coupons', h(adminController.listCoupons));
admin.post('/coupons', validate(s.couponBody), h(adminController.createCoupon));
admin.patch('/coupons/:code', validate(s.codeParams, 'params'), validate(s.couponPatch), h(adminController.updateCoupon));
admin.get('/orders', validate(s.adminOrderQuery, 'query'), h(adminController.listOrders));
admin.get('/orders/:id', validate(s.idParams, 'params'), h(adminController.orderDetail));
admin.patch('/orders/:id/status', validate(s.idParams, 'params'), validate(s.orderStatusBody), h(adminController.updateOrderStatus));
admin.post('/orders/:id/reconcile', validate(s.idParams, 'params'), h(adminController.reconcileOrder));
admin.get('/webhook-events', h(adminController.webhookEvents));
apiRouter.use('/admin', admin);
